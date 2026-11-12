const SEARCH_STATE_KEY = "flightFinder.lastSearch.v1";
const SEARCH_SETUP_KEY = "flightFinder.searchSetup.v1";

let destinationsData = [];
let selectedDestinations = [];
let maxDestinations = 3;
let maxNights = 30;
let maxResults = 5;
let departureAirports = [{ code: "BUD", city: "Budapest" }];
let defaultOrigin = "BUD";

const dropdownCloseTimers = new WeakMap();
let destinationAutocomplete;
let originAutocomplete;

let currentResults = [];
let failedCount = 0;
let resultNodes = [];
let isSearching = false;
let lastSearchParameters = null;
let searchAbortController = null;

let searchAccess = null;
let searchAccessLoading = true;
let searchAccessRequestId = 0;
let searchOwnerUserId = null;
let searchPageInitialized = false;
let searchPageActive = true;
let searchSessionRequestId = 0;
let searchSessionRefreshController = null;
let searchRefreshInterrupted = false;
let viewNavigationRequestId = 0;
let configuredMaxDestinations = 3;
let sessionExpirationErrorActive = false;

const resultCardResizeObserver =
  typeof ResizeObserver === "undefined"
    ? null
    : new ResizeObserver((entries) => {
        entries.forEach(({ target, contentRect }) => {
          if (!target.isConnected) {
            resultCardResizeObserver?.unobserve(target);
            return;
          }

          updateResultCardLayout(target, contentRect.width);
        });
      });

function initializeResultsScrollbar() {
  const appShell = document.getElementById("app-shell");
  const searchView = document.getElementById("search-view");
  const appHeader = document.getElementById("app-header");
  const results = document.getElementById("results");
  const footer = document.getElementById("results-footer");
  const track = document.getElementById("results-scrollbar");
  const thumb = document.getElementById("results-scrollbar-thumb");

  if (
    !appShell ||
    !searchView ||
    !appHeader ||
    !results ||
    !footer ||
    !track ||
    !thumb
  ) {
    throw new Error("Results scrollbar elements are missing");
  }

  let dragOffset = null;

  const update = () => {
    const isDesktop = window.matchMedia("(min-width: 769px)").matches;
    const isSearchView = !searchView.hidden;
    const hasResults = results.querySelector(".result-card") !== null;

    if (!isDesktop || !isSearchView) {
      appShell.style.removeProperty("height");
      appShell.style.removeProperty("min-height");
      searchView.style.removeProperty("min-height");
    } else {
      const shellRect = appShell.getBoundingClientRect();
      const resultsRect = results.getBoundingClientRect();
      const actualContentHeight = Math.max(
        0,
        ...Array.from(results.children, (child) => {
          const childRect = child.getBoundingClientRect();
          const marginBottom = Number.parseFloat(
            getComputedStyle(child).marginBottom,
          );
          return (
            childRect.bottom -
            resultsRect.top +
            results.scrollTop +
            marginBottom
          );
        }),
      );
      const firstCard = results.querySelector(".result-card");
      const minimumResultsHeight = firstCard
        ? Math.max(120, firstCard.getBoundingClientRect().height)
        : 0;
      const shellStyle = getComputedStyle(appShell);
      const fixedContentHeight = resultsRect.top - shellRect.top;
      const footerRect = footer.getBoundingClientRect();
      const footerStyle = getComputedStyle(footer);
      const footerSpace =
        footerStyle.display === "none"
          ? 0
          : footerRect.height +
            Number.parseFloat(footerStyle.marginTop) +
            Number.parseFloat(footerStyle.marginBottom);
      const bottomSpace =
        Number.parseFloat(shellStyle.paddingBottom) +
        Number.parseFloat(shellStyle.borderBottomWidth);
      const minimumShellHeight =
        fixedContentHeight + minimumResultsHeight + footerSpace + bottomSpace;
      const contentShellHeight =
        fixedContentHeight +
        Math.max(actualContentHeight, minimumResultsHeight) +
        footerSpace +
        bottomSpace;
      const availableShellHeight =
        window.innerHeight -
        Number.parseFloat(shellStyle.marginTop) -
        Number.parseFloat(shellStyle.marginBottom);
      const shellHeight = Math.max(
        minimumShellHeight,
        Math.min(contentShellHeight, availableShellHeight),
      );
      const requestedHeight = `${shellHeight}px`;
      const requestedMinimumHeight = `${minimumShellHeight}px`;

      searchView.style.minHeight = "0";
      if (appShell.style.minHeight !== requestedMinimumHeight) {
        appShell.style.minHeight = requestedMinimumHeight;
      }
      if (appShell.style.height !== requestedHeight) {
        appShell.style.height = requestedHeight;
      }
    }

    const hasOverflow =
      isDesktop &&
      isSearchView &&
      hasResults &&
      results.scrollHeight > results.clientHeight + 1;
    const resultsRect = results.getBoundingClientRect();
    const scrollContentHeight = Math.max(
      results.scrollHeight,
      ...Array.from(results.children, (child) => {
        const childRect = child.getBoundingClientRect();
        return childRect.bottom - resultsRect.top + results.scrollTop;
      }),
    );

    track.dataset.hasResults = String(isDesktop && isSearchView && hasResults);
    track.dataset.active = String(hasOverflow);
    track.style.height = `${
      isDesktop && isSearchView && hasResults
        ? Math.min(results.clientHeight, scrollContentHeight)
        : 0
    }px`;

    if (!hasOverflow) {
      thumb.style.height = "0px";
      thumb.style.transform = "translateY(0)";
      return;
    }

    const trackHeight = track.clientHeight;
    const thumbHeight = Math.min(
      trackHeight,
      (trackHeight * results.clientHeight) / results.scrollHeight,
    );
    const thumbTravel = trackHeight - thumbHeight;
    const scrollTravel = results.scrollHeight - results.clientHeight;
    const thumbTop = (results.scrollTop / scrollTravel) * thumbTravel;

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
  };

  const scrollToTrackPosition = (clientY, offset) => {
    const trackRect = track.getBoundingClientRect();
    const thumbHeight = thumb.getBoundingClientRect().height;
    const thumbTravel = track.clientHeight - thumbHeight;

    if (thumbTravel <= 0) return;

    const thumbTop = Math.max(
      0,
      Math.min(
        track.clientHeight - thumbHeight,
        clientY - trackRect.top - offset,
      ),
    );
    const scrollTravel = results.scrollHeight - results.clientHeight;

    results.scrollTop = (thumbTop / thumbTravel) * scrollTravel;
  };

  results.addEventListener("scroll", update, { passive: true });
  track.addEventListener("pointerdown", (event) => {
    if (track.dataset.active !== "true") return;

    event.preventDefault();
    const thumbRect = thumb.getBoundingClientRect();
    dragOffset =
      event.target === thumb
        ? event.clientY - thumbRect.top
        : thumbRect.height / 2;
    scrollToTrackPosition(event.clientY, dragOffset);
    track.setPointerCapture(event.pointerId);
  });
  track.addEventListener("pointermove", (event) => {
    if (dragOffset !== null) {
      scrollToTrackPosition(event.clientY, dragOffset);
    }
  });
  const endDrag = () => {
    dragOffset = null;
  };
  track.addEventListener("pointerup", endDrag);
  track.addEventListener("pointercancel", endDrag);
  track.addEventListener("lostpointercapture", endDrag);
  track.addEventListener(
    "wheel",
    (event) => {
      if (track.dataset.active !== "true") return;

      event.preventDefault();
      results.scrollTop += event.deltaY;
    },
    { passive: false },
  );

  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(appHeader);
  resizeObserver.observe(footer);
  resizeObserver.observe(searchView);
  resizeObserver.observe(results);
  resizeObserver.observe(track);

  const mutationObserver = new MutationObserver(update);
  mutationObserver.observe(results, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  const footerObserver = new MutationObserver(update);
  footerObserver.observe(footer, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  const viewObserver = new MutationObserver(update);
  viewObserver.observe(searchView, {
    attributes: true,
    attributeFilter: ["hidden"],
  });

  window.addEventListener("resize", () => {
    results.querySelectorAll(".result-card").forEach((card) => {
      updateResultCardLayout(card);
    });
    update();
  });
  update();
}

window.emailVerificationRequired = true;

/* ========================= */
/* INIT */
/* ========================= */

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isSearchAccessReady() {
  return (
    searchAccess !== null && !searchAccessLoading && isCurrentUserVerified()
  );
}

function setSearchAccessUnavailable(message) {
  searchAccessRequestId++;
  searchAccess = null;
  searchAccessLoading = false;

  originAutocomplete?.close();
  destinationAutocomplete?.close();

  document.getElementById("search-access-status").textContent = message;

  updateSearchControls();
}

function updateDestinationPlaceholder(ready) {
  const input = document.getElementById("destination-input");
  if (!ready) {
    input.placeholder = "Type city or IATA code...";
    return;
  }

  const remaining = Math.max(0, maxDestinations - selectedDestinations.length);
  input.placeholder = remaining
    ? `Type city or IATA code (${remaining} left)`
    : "Max selected";
}

function updateSearchControls() {
  const ready = isSearchAccessReady();
  const policy = searchAccess?.policy;
  const airportsAvailable = destinationsData.length > 0;

  updateDestinationPlaceholder(ready);

  document.getElementById("premium-badge").hidden =
    searchAccess?.plan !== "premium";

  document.getElementById("origin-input").disabled =
    !ready || !airportsAvailable || !policy.canSelectOrigin;

  document.getElementById("destination-input").disabled =
    !ready ||
    !airportsAvailable ||
    selectedDestinations.length >= maxDestinations;

  document.getElementById("weekday").disabled =
    !ready || !policy.canSelectWeekday;

  document.getElementById("nights").disabled =
    !ready || !policy.canSelectNights;

  document.getElementById("start-date").disabled =
    !ready || !policy.canSelectStartDate;

  document.querySelectorAll(".stepper button").forEach((button) => {
    button.disabled = !ready || !policy.canSelectNights;
  });

  document.getElementById("search-button").disabled =
    !ready || !airportsAvailable || isSearching;
}

function isValidSearchAccess(data) {
  const policy = data?.policy;

  return (
    data?.success === true &&
    ["anonymous", "registered", "premium"].includes(data.plan) &&
    policy !== null &&
    typeof policy === "object" &&
    !Array.isArray(policy) &&
    [
      "canSelectOrigin",
      "canSelectWeekday",
      "canSelectNights",
      "canSelectStartDate",
      "smartFlexEnabled",
    ].every((field) => typeof policy[field] === "boolean") &&
    Number.isInteger(policy.maxDestinations) &&
    policy.maxDestinations >= 1 &&
    Number.isInteger(policy.fixedWeekday) &&
    policy.fixedWeekday >= 0 &&
    policy.fixedWeekday <= 6 &&
    Number.isInteger(policy.fixedNights) &&
    policy.fixedNights >= 1 &&
    policy.fixedNights <= maxNights
  );
}

function applySearchAccessToForm() {
  const { plan, policy } = searchAccess;

  maxDestinations = Math.min(configuredMaxDestinations, policy.maxDestinations);

  if (!policy.canSelectOrigin) {
    document.getElementById("origin").value = defaultOrigin;
  }

  if (!policy.canSelectWeekday) {
    document.getElementById("weekday").value = policy.fixedWeekday;
  }

  if (!policy.canSelectNights) {
    document.getElementById("nights").value = policy.fixedNights;
  }

  const dateInput = document.getElementById("start-date");
  const today = getTodayDate();

  dateInput.min = today;

  if (
    !policy.canSelectStartDate ||
    !dateInput.value ||
    dateInput.value < today
  ) {
    dateInput.value = today;
  }

  const destinationLimitExceeded =
    selectedDestinations.length > maxDestinations;
  const origin = document.getElementById("origin").value;

  if (destinationLimitExceeded) {
    selectedDestinations = [];
  } else {
    selectedDestinations = selectedDestinations.filter(
      (code) => code !== origin,
    );
  }

  originAutocomplete?.close();
  destinationAutocomplete?.close();

  renderOrigin();
  renderSelected();

  const labels = {
    anonymous: "Guest",
    registered: "Registered",
    premium: "Premium",
  };

  const noun = maxDestinations === 1 ? "destination" : "destinations";

  const message =
    `${labels[plan]} · Up to ${maxDestinations} ${noun}` +
    ` · Smart Flex: ${policy.smartFlexEnabled ? "on" : "off"}`;

  document.getElementById("search-access-status").textContent = message;

  if (destinationLimitExceeded) {
    showSearchValidationError(
      "⚠️ Destinations have been cleared. Please select again.",
      { preserveSelection: true },
    );
  }
}

async function refreshSearchAccess({ signal } = {}) {
  const requestId = ++searchAccessRequestId;
  const context = getSessionContext();
  const token = context.token;

  const isCurrent = () =>
    !signal?.aborted &&
    requestId === searchAccessRequestId &&
    isSessionContextCurrent(context);

  searchAccess = null;
  searchAccessLoading = true;

  originAutocomplete?.close();
  destinationAutocomplete?.close();
  updateSearchControls();

  const status = document.getElementById("search-access-status");
  status.textContent = "Loading search settings...";

  try {
    const response = await fetch("/api/search-access", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      signal,
    });

    if (!isCurrent()) return;
    if (expireSessionIfUnauthorized(response, context)) return;

    if (!response.ok) {
      throw new Error(`Search access request failed: ${response.status}`);
    }

    const data = await response.json();

    if (!isCurrent()) return;

    if (!isValidSearchAccess(data)) {
      throw new Error("Invalid search access response");
    }

    searchAccess = data;
    searchAccessLoading = false;

    applySearchAccessToForm();
  } catch (error) {
    if (!isCurrent()) return;

    searchAccess = null;
    searchAccessLoading = false;

    status.textContent =
      "Search settings could not be loaded. Please reload the page to try again.";

    console.error("Failed to load search access:", error);
  } finally {
    if (isCurrent()) {
      updateSearchControls();
    }
  }
}

function pauseSearchPage() {
  invalidateCurrentUserVerification();

  if (searchAbortController) {
    searchAbortController.abort();
    searchAbortController = null;
    isSearching = false;
    saveSearchState("interrupted");
  }

  document.getElementById("results").hidden = true;
  document.getElementById("auth-container").hidden = true;
  document.getElementById("admin-link").hidden = true;

  setSearchAccessUnavailable("Verifying your session...");
}

function setAppView(view) {
  document.getElementById("search-view").hidden = view !== "search";
  document.getElementById("admin-view").hidden = view !== "admin";
  const adminLink = document.getElementById("admin-link");
  const adminIcon = adminLink.querySelector("span");
  const isAdminView = view === "admin";

  adminLink.href = isAdminView ? "#search" : "#admin";
  adminLink.setAttribute(
    "aria-label",
    isAdminView ? "Back to Flight Finder" : "Administration",
  );
  adminLink.title = isAdminView ? "Back to Flight Finder" : "Administration";
  adminIcon.textContent = isAdminView ? "←" : "⚙";

  document.title = isAdminView
    ? "Flight Finder | Administration"
    : "Flight Finder | Perfect Weekend Getaways";
}

function navigateToSearch({ replace = false } = {}) {
  if (location.hash !== "#search") {
    const updateHistory = replace ? history.replaceState : history.pushState;
    updateHistory.call(history, { view: "search" }, "", "#search");
  }

  viewNavigationRequestId++;
  setAppView("search");
}

function abortActiveSearch() {
  const controller = searchAbortController;
  if (!controller) return;

  saveSearchState("interrupted");

  const footer = document.getElementById("results-footer");
  if (footer) {
    footer.textContent = `Search interrupted. Run a new search to finish. (failed: ${failedCount})`;
  }

  controller.abort();
  searchAbortController = null;
  isSearching = false;
  updateSearchControls();
}

async function activateAdminView({ updateHistory = true } = {}) {
  const requestId = ++viewNavigationRequestId;
  const interruptedRefresh = cancelSearchSessionRefresh();
  const context = getSessionContext();
  const authState = await loadCurrentUser();

  if (requestId !== viewNavigationRequestId || !searchPageActive) {
    return;
  }

  if (
    authState !== "authenticated" ||
    authUser?.isAdmin !== true ||
    !isSessionContextCurrent(context)
  ) {
    navigateToSearch({ replace: true });
    renderAuthUI();
    if (searchRefreshInterrupted) void refreshSessionAndRoute();
    return;
  }

  if (interruptedRefresh) {
    renderAuthUI();
    document.getElementById("auth-container").hidden = false;
  }

  abortActiveSearch();

  if (updateHistory && location.hash !== "#admin") {
    history.pushState({ view: "admin" }, "", "#admin");
  }

  setAppView("admin");

  const initializeAdmin = window.initializeAdminView;
  if (typeof initializeAdmin !== "function") {
    throw new Error("Administration view could not be initialized.");
  }

  const initialized = await initializeAdmin();

  if (requestId !== viewNavigationRequestId || !searchPageActive) return;

  if (!initialized) {
    navigateToSearch({ replace: true });
    renderAuthUI();
    if (searchRefreshInterrupted) void refreshSessionAndRoute();
  }
}

function initializeAppViewNavigation() {
  document.getElementById("admin-link").addEventListener("click", (event) => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    if (document.getElementById("admin-view").hidden) {
      void activateAdminView();
    } else {
      navigateToSearch();
      void refreshSessionAndRoute();
    }
  });

  window.addEventListener("popstate", () => {
    if (location.hash === "#admin") {
      void activateAdminView({ updateHistory: false });
    } else {
      const returningFromAdmin = !document.getElementById("admin-view").hidden;
      viewNavigationRequestId++;
      setAppView("search");
      if (returningFromAdmin || searchRefreshInterrupted) {
        void refreshSessionAndRoute();
      }
    }
  });
}

function cancelSearchSessionRefresh() {
  if (!searchSessionRefreshController) return false;

  searchSessionRequestId++;
  invalidateCurrentUserVerification();
  setSearchAccessUnavailable("Verifying your session...");
  searchSessionRefreshController.abort();
  searchSessionRefreshController = null;
  searchRefreshInterrupted = true;
  return true;
}

function refreshSearchSession() {
  cancelSearchSessionRefresh();
  searchRefreshInterrupted = false;
  const controller = new AbortController();
  searchSessionRefreshController = controller;
  const refresh = runSearchSessionRefresh(controller.signal);
  const clearRefresh = () => {
    if (searchSessionRefreshController === controller) {
      searchSessionRefreshController = null;
    }
  };
  refresh.then(clearRefresh, clearRefresh);
  return refresh;
}

async function runSearchSessionRefresh(signal) {
  if (!searchPageInitialized || !searchPageActive) return;

  const requestId = ++searchSessionRequestId;

  const isCurrent = () =>
    !signal.aborted && requestId === searchSessionRequestId && searchPageActive;

  pauseSearchPage();

  const authState = await loadCurrentUser({ signal });

  if (!isCurrent() || authState === "stale") return;

  if (authState === "unavailable") {
    setSearchAccessUnavailable(
      "Your session could not be verified. Please reload the page to try again.",
    );
    return;
  }

  const context = getSessionContext();

  if (searchOwnerUserId !== null && searchOwnerUserId !== authUser?.id) {
    clearPrivateSearchResults();
  }

  restoreSearchState();
  await refreshSearchAccess({ signal });

  if (!isCurrent() || !isSessionContextCurrent(context)) return;

  if (authState === "authenticated") {
    clearSessionExpirationError();
  }

  renderAuthUI();
  document.getElementById("auth-container").hidden = false;
  document.getElementById("results").hidden = false;
}

async function refreshSessionAndRoute() {
  const requestId = ++viewNavigationRequestId;
  const shouldRestoreAdmin = location.hash === "#admin";

  if (shouldRestoreAdmin) {
    setAppView("search");
  }

  await refreshSearchSession();

  if (requestId !== viewNavigationRequestId || !shouldRestoreAdmin) return;

  if (
    authUser?.isAdmin === true &&
    isCurrentUserVerified() &&
    isSessionContextCurrent(getSessionContext())
  ) {
    await activateAdminView({ updateHistory: false });
  } else {
    navigateToSearch({ replace: true });
  }
}

window.addEventListener("auth-changed", async () => {
  await refreshSessionAndRoute();
});

window.addEventListener("pagehide", () => {
  searchPageActive = false;
  cancelSearchSessionRefresh();
  searchSessionRequestId++;
  pauseSearchPage();
});

window.addEventListener("pageshow", async (event) => {
  searchPageActive = true;

  if (event.persisted) {
    await refreshSessionAndRoute();
  }
});

window.addEventListener("storage", async (event) => {
  if (
    event.storageArea === localStorage &&
    (event.key === "authToken" || event.key === null)
  ) {
    invalidateSessionForTokenChange();
    await refreshSessionAndRoute();
  }
});

window.onload = async function () {
  initializeResultsScrollbar();

  const startDateInput = document.getElementById("start-date");
  const today = getTodayDate();

  startDateInput.value = today;
  startDateInput.min = today;

  try {
    const res = await fetch("/destinations");

    if (!res.ok) {
      throw new Error(`Destinations request failed: ${res.status}`);
    }

    const destinations = await res.json();

    if (
      !Array.isArray(destinations) ||
      !destinations.every(
        (destination) =>
          destination &&
          typeof destination.label === "string" &&
          typeof destination.value === "string",
      )
    ) {
      throw new Error("Invalid destinations response");
    }

    destinationsData = destinations;
  } catch (error) {
    destinationsData = [];

    document.getElementById("destination-input").disabled = true;
    document.getElementById("search-button").disabled = true;

    const message = document.getElementById("destinations-error");

    message.textContent =
      "Destinations could not be loaded. Please reload the page to try again.";
    message.hidden = false;

    console.error("Failed to load destinations:", error);
  }

  try {
    const configRes = await fetch("/config");

    if (!configRes.ok) {
      throw new Error(`Config request failed: ${configRes.status}`);
    }

    const config = await configRes.json();

    defaultOrigin = config.departureAirports?.default ?? defaultOrigin;

    maxDestinations = config.destinations.maxSelected ?? maxDestinations;
    maxNights = config.search.maxNights ?? maxNights;
    maxResults = config.search.maxResults ?? maxResults;

    window.emailVerificationRequired =
      config.auth?.emailVerificationRequired ?? true;
  } catch (err) {
    console.error("Failed to load config:", err);
  }

  configuredMaxDestinations = maxDestinations;
  configureDepartureAirports();
  setupAutocomplete();
  loadTheme();

  const nightsInput = document.getElementById("nights");

  nightsInput.addEventListener("input", () => {
    let value = Number(nightsInput.value);

    if (!value || value < 1) {
      value = 1;
    }

    if (value > maxNights) {
      value = maxNights;
    }

    nightsInput.value = value;
    saveSearchSetup();
  });

  document
    .getElementById("weekday")
    .addEventListener("change", saveSearchSetup);

  startDateInput.addEventListener("change", saveSearchSetup);

  restoreSearchSetup();
  searchPageInitialized = true;

  if (sessionStorage.getItem("flightFinder.sessionExpired") === "true") {
    sessionStorage.removeItem("flightFinder.sessionExpired");
    endSession({ expired: true });
  }

  initializeAppViewNavigation();
  await refreshSearchSession();

  if (location.hash === "#admin") {
    await activateAdminView({ updateHistory: false });
  } else {
    setAppView("search");
  }
};

/* ========================= */
/* AUTOCOMPLETE */
/* ========================= */

function setupAutocomplete() {
  destinationAutocomplete = setupAirportAutocomplete({
    inputId: "destination-input",
    listId: "autocomplete-list",
    available: (airport) =>
      airport.value !== document.getElementById("origin").value,
    onSelect: selectDestination,
  });

  originAutocomplete = setupAirportAutocomplete({
    inputId: "origin-input",
    listId: "origin-autocomplete-list",
    available: (airport) => !selectedDestinations.includes(airport.value),
    onSelect: selectOriginAirport,
    showOnFocus: true,
    onBlur: renderOrigin,
  });
}

function setupAirportAutocomplete({
  inputId,
  listId,
  available,
  onSelect,
  showOnFocus = false,
  onBlur,
}) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(listId);
  let focus = -1;
  let timer;

  function close() {
    clearTimeout(timer);
    timer = null;
    focus = -1;
    list.replaceChildren();
    closeDropdown(list);
    input.setAttribute("aria-expanded", "false");
  }

  function render(query = input.value) {
    if (input.disabled) {
      close();
      return;
    }
    clearTimeout(timer);
    timer = null;
    focus = -1;
    list.replaceChildren();
    const value = query.trim().toLowerCase();
    if (!value && !showOnFocus) {
      close();
      return;
    }

    const matches = destinationsData.filter(
      (airport) =>
        available(airport) &&
        (airport.label.toLowerCase().includes(value) ||
          airport.value.toLowerCase().includes(value)),
    );

    matches.forEach((airport) => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      const text = `${airport.label} (${airport.value})`;
      let offset = 0;
      let match = value ? text.toLowerCase().indexOf(value) : -1;
      while (match !== -1) {
        item.appendChild(document.createTextNode(text.slice(offset, match)));
        const strong = document.createElement("strong");
        strong.textContent = text.slice(match, match + value.length);
        item.appendChild(strong);
        offset = match + value.length;
        match = text.toLowerCase().indexOf(value, offset);
      }
      item.appendChild(document.createTextNode(text.slice(offset)));
      item.addEventListener("mousedown", (event) => event.preventDefault());
      item.addEventListener("click", () => {
        if (!available(airport)) return;
        onSelect(airport);
        close();
      });
      list.appendChild(item);
    });
    matches.length ? openDropdown(list) : closeDropdown(list);
    input.setAttribute("aria-expanded", String(matches.length > 0));
  }

  input.setAttribute("aria-controls", listId);
  input.setAttribute("aria-expanded", "false");
  input.addEventListener("input", () => {
    close();
    timer = setTimeout(() => render(), 120);
  });
  if (showOnFocus) {
    input.addEventListener("focus", () => {
      destinationAutocomplete?.close();
      input.select();
      render("");
    });
    input.addEventListener("click", () => {
      input.select();
      render("");
    });
  } else {
    input.addEventListener("focus", () => originAutocomplete?.close());
  }
  input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      close();
      onBlur?.();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) return;
    event.preventDefault();
    if (timer) render();
    if (
      list.classList.contains("hidden") &&
      showOnFocus &&
      event.key !== "Enter"
    )
      render("");
    const items = list.getElementsByClassName("autocomplete-item");
    if (!items.length) return;
    if (event.key === "Enter") {
      items[focus < 0 ? 0 : focus].click();
      return;
    }
    focus += event.key === "ArrowDown" ? 1 : -1;
    if (focus >= items.length) focus = 0;
    if (focus < 0) focus = items.length - 1;
    for (const item of items) item.classList.remove("active");
    items[focus].classList.add("active");
    items[focus].scrollIntoView({ block: "nearest", behavior: "auto" });
  });
  input.addEventListener("blur", () => {
    close();
    onBlur?.();
  });
  document.addEventListener("click", (event) => {
    if (!input.parentElement.contains(event.target)) close();
  });
  return {
    close,
    refresh: () => {
      if (document.activeElement === input) render();
    },
  };
}

/* ========================= */
/* DROPDOWN */
/* ========================= */

function openDropdown(list) {
  clearTimeout(dropdownCloseTimers.get(list));

  list.classList.remove("hidden");

  requestAnimationFrame(() => {
    list.classList.add("open");
  });
}

function closeDropdown(list) {
  list.classList.remove("open");

  clearTimeout(dropdownCloseTimers.get(list));

  dropdownCloseTimers.set(
    list,
    setTimeout(() => {
      list.classList.add("hidden");
    }, 150),
  );
}

/* ========================= */
/* DESTINATIONS */
/* ========================= */

function showSearchValidationError(
  message = "",
  { preserveSelection = false } = {},
) {
  const container = document.getElementById("selected-container");

  if (!message) {
    if (sessionExpirationErrorActive) return;

    if (container.querySelector(".error-card")) {
      renderSelected();
    }
    return;
  }

  if (
    sessionExpirationErrorActive &&
    message !== "⚠️ Your session has expired. Please sign in again."
  ) {
    return;
  }

  let error = container.querySelector("#search-validation-error");
  const isNewError = error === null;

  if (isNewError) {
    error = document.createElement("div");
    error.id = "search-validation-error";
    error.className = "card error-card";
    error.tabIndex = 0;
    error.setAttribute("role", "alert");
    error.title = "Click to dismiss";

    const dismiss = () => {
      if (
        sessionExpirationErrorActive ||
        error.dataset.preserveSelection === "true"
      ) {
        error.remove();
        container.classList.remove("has-search-access-warning");
        sessionExpirationErrorActive = false;
      } else {
        renderSelected();
      }
    };

    error.addEventListener("click", dismiss);
    error.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        dismiss();
      }
    });
  }

  error.textContent = message;
  error.dataset.preserveSelection = String(preserveSelection);

  if (preserveSelection) {
    container.classList.add("has-search-access-warning");
    container.appendChild(error);
  } else {
    container.replaceChildren(error);
  }
}

function clearSearchValidationError() {
  const error = document.getElementById("search-validation-error");

  error?.remove();
  document
    .getElementById("selected-container")
    .classList.remove("has-search-access-warning");
}

function showSessionExpirationError() {
  sessionExpirationErrorActive = true;
  showSearchValidationError(
    "⚠️ Your session has expired. Please sign in again.",
    { preserveSelection: true },
  );
}

function clearSessionExpirationError() {
  if (!sessionExpirationErrorActive) return;

  sessionExpirationErrorActive = false;
  clearSearchValidationError();
}

function renderOrigin() {
  const code = document.getElementById("origin").value;
  const airport = departureAirports.find((item) => item.code === code);
  document.getElementById("origin-input").value = airport
    ? `${airport.city} (${code})`
    : code;
}

function selectOriginAirport(airport) {
  if (!isSearchAccessReady() || !searchAccess.policy.canSelectOrigin) {
    return;
  }
  if (selectedDestinations.includes(airport.value)) return;
  if (!destinationsData.some((item) => item.value === airport.value)) return;
  document.getElementById("origin").value = airport.value;
  renderOrigin();
  destinationAutocomplete?.close();
  showSearchValidationError();
  saveSearchSetup();
}

function selectDestination(dest) {
  if (!isSearchAccessReady()) return;
  if (selectedDestinations.length >= maxDestinations) return;
  if (selectedDestinations.includes(dest.value)) return;
  if (dest.value === document.getElementById("origin").value) return;

  selectedDestinations.push(dest.value);
  renderSelected();

  document.getElementById("destination-input").value = "";
  closeDropdown(document.getElementById("autocomplete-list"));
}

function renderSelected() {
  const container = document.getElementById("selected-container");
  const sessionError = sessionExpirationErrorActive
    ? container.querySelector("#search-validation-error")
    : null;

  if (!sessionError) {
    container.classList.remove("has-search-access-warning");
  }

  container.innerHTML = "";

  selectedDestinations.forEach((code) => {
    const badge = document.createElement("div");
    badge.className = "iata-badge";
    badge.textContent = code;
    badge.title = "Click to remove";

    badge.addEventListener("click", () => {
      selectedDestinations = selectedDestinations.filter((c) => c !== code);
      renderSelected();
    });

    container.appendChild(badge);
  });

  if (sessionError) {
    container.appendChild(sessionError);
  }

  updateSearchControls();

  originAutocomplete?.refresh();
  showSearchValidationError();
  saveSearchSetup();
}

/* ========================= */
/* SEARCH */
/* ========================= */

function isSearchRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isSearchDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

function isSearchAirportCode(value) {
  return (
    typeof value === "string" && value.length === 3 && /^[A-Z]{3}$/.test(value)
  );
}

function isValidSearchResult(item) {
  if (!isSearchRecord(item) || !isSearchRecord(item.destination)) {
    return false;
  }

  const validAirport = (airport) =>
    isSearchRecord(airport) &&
    isSearchAirportCode(airport.code) &&
    (airport.city === undefined || typeof airport.city === "string");

  const insight = item.priceInsight;

  return (
    validAirport(item.destination) &&
    (item.origin === undefined || validAirport(item.origin)) &&
    isSearchDate(item.departure) &&
    isSearchDate(item.return) &&
    item.return > item.departure &&
    Number.isFinite(item.price) &&
    item.price > 0 &&
    typeof item.currency === "string" &&
    /^[A-Z]{3}$/.test(item.currency) &&
    item.currency.length === 3 &&
    ["base", "flex", "fallback-flex"].includes(item.resultType) &&
    (item.bookingUrl === undefined ||
      getSafeBookingUrl(item.bookingUrl) !== null) &&
    (insight === undefined ||
      (isSearchRecord(insight) &&
        Number.isInteger(insight.percent) &&
        insight.percent >= 0 &&
        insight.percent <= 100 &&
        Number.isFinite(insight.basePrice) &&
        insight.basePrice > 0))
  );
}

function isValidSavedSearch(saved) {
  if (!isSearchRecord(saved) || !isSearchRecord(saved.parameters)) {
    return false;
  }

  const parameters = saved.parameters;

  return (
    Array.isArray(saved.results) &&
    saved.results.every(isValidSearchResult) &&
    Number.isSafeInteger(saved.failedCount) &&
    saved.failedCount >= 0 &&
    ["searching", "completed", "interrupted"].includes(saved.status) &&
    isSearchAirportCode(parameters.origin) &&
    Array.isArray(parameters.destinations) &&
    parameters.destinations.length > 0 &&
    parameters.destinations.every(isSearchAirportCode) &&
    !parameters.destinations.includes(parameters.origin) &&
    new Set(parameters.destinations).size === parameters.destinations.length &&
    Number.isInteger(parameters.weekday) &&
    parameters.weekday >= 0 &&
    parameters.weekday <= 6 &&
    Number.isSafeInteger(parameters.nights) &&
    parameters.nights > 0 &&
    isSearchDate(parameters.startDate) &&
    typeof parameters.startedAt === "string" &&
    Number.isFinite(Date.parse(parameters.startedAt))
  );
}

function saveSearchState(status) {
  if (!lastSearchParameters) return;

  try {
    sessionStorage.setItem(
      SEARCH_STATE_KEY,
      JSON.stringify({
        ownerUserId: searchOwnerUserId,
        parameters: lastSearchParameters,
        results: currentResults,
        failedCount,
        status,
      }),
    );
  } catch (error) {
    console.warn("Could not save search results:", error);
  }
}

function clearSearchResults() {
  searchAbortController?.abort();

  currentResults = [];
  resultNodes = [];
  failedCount = 0;
  lastSearchParameters = null;
  searchOwnerUserId = null;

  const results = document.getElementById("results");
  results.querySelectorAll(".result-card").forEach((card) => {
    resultCardResizeObserver?.unobserve(card);
  });
  results.innerHTML = "";
  const footer = document.getElementById("results-footer");
  if (footer) footer.textContent = "";

  try {
    sessionStorage.removeItem(SEARCH_STATE_KEY);
  } catch (error) {
    console.warn("Could not clear saved search results:", error);
  }
}

function clearPrivateSearchResults() {
  try {
    const saved = JSON.parse(
      sessionStorage.getItem(SEARCH_STATE_KEY) || "null",
    );

    if (searchOwnerUserId !== null || (saved && saved.ownerUserId !== null)) {
      clearSearchResults();
    }
  } catch {
    clearSearchResults();
  }
}

function restoreSearchState() {
  try {
    const stored = sessionStorage.getItem(SEARCH_STATE_KEY);
    if (!stored) return;

    const saved = JSON.parse(stored);

    if (!isValidSavedSearch(saved)) {
      clearSearchResults();
      return;
    }

    const ownerUserId = saved.ownerUserId;

    if (
      ownerUserId !== null &&
      (!Number.isSafeInteger(ownerUserId) ||
        ownerUserId < 1 ||
        ownerUserId !== authUser?.id)
    ) {
      clearSearchResults();
      return;
    }

    searchOwnerUserId = ownerUserId;

    lastSearchParameters = saved.parameters;
    failedCount = saved.failedCount;

    const resultsDiv = document.getElementById("results");

    resultsDiv.querySelectorAll(".result-card").forEach((card) => {
      resultCardResizeObserver?.unobserve(card);
    });
    resultsDiv.innerHTML = "";
    currentResults = [];
    resultNodes = [];

    initFooter(resultsDiv);

    saved.results.forEach((item) => {
      insertSortedWithDOM(item, resultsDiv);
    });

    if (saved.status === "completed") {
      if (currentResults.length === 0) {
        if (failedCount > 0) {
          showSearchUnavailable(resultsDiv);
        } else {
          showNoResults(resultsDiv);
        }
      }

      updateFooter(resultsDiv, true);
    } else {
      document.getElementById("results-footer").textContent =
        `Search interrupted. Run a new search to finish. (failed: ${failedCount})`;
    }

    const timestamp = document.createElement("div");
    timestamp.className = "meta-info saved-search-info";
    timestamp.textContent = `Saved search: ${new Date(saved.parameters.startedAt).toLocaleString()}. `;

    const priceNotice = document.createElement("div");
    priceNotice.className = "price-change-warning";
    priceNotice.textContent = "Prices may have changed.";
    timestamp.appendChild(priceNotice);

    getOrCreateFooter(resultsDiv).appendChild(timestamp);
  } catch (error) {
    console.warn("Could not restore search results:", error);
    clearSearchResults();
  }
}

function configureDepartureAirports() {
  departureAirports = destinationsData.map(({ value, label }) => ({
    code: value,
    city: label,
  }));
  const input = document.getElementById("origin-input");
  input.disabled = true;
  if (
    departureAirports.length &&
    !departureAirports.some(({ code }) => code === defaultOrigin)
  ) {
    defaultOrigin = departureAirports[0].code;
  }
  document.getElementById("origin").value = defaultOrigin;
  renderOrigin();
}

function saveSearchSetup() {
  try {
    sessionStorage.setItem(
      SEARCH_SETUP_KEY,
      JSON.stringify({
        origin: document.getElementById("origin").value,
        destinations: [...selectedDestinations],
        weekday: Number(document.getElementById("weekday").value),
        nights: Number(document.getElementById("nights").value),
        startDate: document.getElementById("start-date").value,
      }),
    );
  } catch (error) {
    console.warn("Could not save search setup:", error);
  }
}

function restoreSearchSetup() {
  try {
    const stored = sessionStorage.getItem(SEARCH_SETUP_KEY);
    if (!stored) return;

    const saved = JSON.parse(stored);

    if (
      !Array.isArray(saved.destinations) ||
      !Number.isInteger(saved.weekday) ||
      saved.weekday < 0 ||
      saved.weekday > 6 ||
      !Number.isInteger(saved.nights) ||
      saved.nights < 1 ||
      saved.nights > maxNights
    ) {
      return;
    }

    const savedOrigin = saved.origin ?? defaultOrigin;

    document.getElementById("origin").value = departureAirports.some(
      (airport) => airport.code === savedOrigin,
    )
      ? savedOrigin
      : defaultOrigin;

    const origin = document.getElementById("origin").value;
    renderOrigin();

    selectedDestinations = saved.destinations
      .filter(
        (code) =>
          code !== origin &&
          destinationsData.some((destination) => destination.value === code),
      )
      .slice(0, maxDestinations);

    document.getElementById("weekday").value = saved.weekday;
    document.getElementById("nights").value = saved.nights;

    const startDateInput = document.getElementById("start-date");
    const today = getTodayDate();

    startDateInput.min = today;
    startDateInput.value =
      typeof saved.startDate === "string" ? saved.startDate : "";

    if (!startDateInput.value || startDateInput.value < today) {
      startDateInput.value = today;
    }

    if (destinationsData.length > 0) {
      renderSelected();
    }
  } catch (error) {
    console.warn("Could not restore search setup:", error);
  }
}

function createSearchEventParser() {
  let line = "";
  let eventType = "";
  let data = [];
  let skipLF = false;

  function processLine(events) {
    if (line === "") {
      if (data.length > 0) {
        events.push({
          type: eventType || "message",
          data: data.join("\n"),
        });
      }

      eventType = "";
      data = [];
      return;
    }

    if (line.startsWith(":")) return;

    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);

    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") eventType = value;
    if (field === "data") data.push(value);
  }

  return (chunk) => {
    const events = [];

    for (const character of chunk) {
      if (skipLF) {
        skipLF = false;
        if (character === "\n") continue;
      }

      if (character === "\r" || character === "\n") {
        processLine(events);
        line = "";
        skipLF = character === "\r";
      } else {
        line += character;
      }
    }

    return events;
  };
}

async function search() {
  if (isSearching || !isSearchAccessReady() || destinationsData.length === 0) {
    return;
  }

  const origin = document.getElementById("origin").value;
  const weekday = Number(document.getElementById("weekday").value);
  const nights = Number(document.getElementById("nights").value);
  const startDateInput = document.getElementById("start-date");

  // The locked start date will still be today, even if the page is left open overnight
  if (!searchAccess.policy.canSelectStartDate) {
    startDateInput.value = getTodayDate();
  }

  const startDate = startDateInput.value;
  const today = getTodayDate();

  startDateInput.min = today;

  const resultsDiv = document.getElementById("results");

  // validation FIRST
  showSearchValidationError();

  if (selectedDestinations.length === 0) {
    showSearchValidationError("⚠️ Please select destination airport(s)");
    return;
  }

  if (selectedDestinations.length > maxDestinations) {
    const noun = maxDestinations === 1 ? "destination" : "destinations";

    showSearchValidationError(
      `Your plan allows up to ${maxDestinations} ${noun}.`,
    );
    return;
  }

  if (selectedDestinations.includes(origin)) {
    showSearchValidationError(
      "Departure and destination airports must differ.",
    );
    return;
  }

  if (!startDate || startDateInput.validity.badInput) {
    showSearchValidationError("Please enter a valid start date.");
    return;
  }

  if (startDate < today) {
    showSearchValidationError("Start date cannot be in the past.");
    return;
  }

  const searchButton = document.getElementById("search-button");

  saveSearchSetup();
  clearSearchResults();

  searchOwnerUserId = authUser?.id ?? null;

  lastSearchParameters = {
    origin,
    destinations: [...selectedDestinations],
    weekday,
    nights,
    startDate,
    startedAt: new Date().toISOString(),
  };

  const context = getSessionContext();
  const controller = new AbortController();
  searchAbortController = controller;

  isSearching = true;
  searchButton.disabled = true;

  saveSearchState("searching");

  try {
    resultsDiv.innerHTML = "";

    // footer reset
    initFooter(resultsDiv);

    // STATE
    currentResults = [];
    failedCount = 0;
    resultNodes = [];

    const token = context.token;

    const response = await fetch("/search-stream", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        origin: lastSearchParameters.origin,
        destinations: lastSearchParameters.destinations,
        weekday,
        nights,
        startDate: lastSearchParameters.startDate,
      }),
    });

    if (controller.signal.aborted || !isSessionContextCurrent(context)) {
      return;
    }

    if (expireSessionIfUnauthorized(response, context)) return;

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    const parseEvents = createSearchEventParser();

    while (true) {
      const { done, value } = await reader.read();
      if (controller.signal.aborted) return;
      if (done) {
        throw new Error("Search stream ended unexpectedly.");
      }

      const events = parseEvents(decoder.decode(value, { stream: true }));

      for (const event of events) {
        if (event.type === "end") {
          if (currentResults.length === 0) {
            if (failedCount > 0) {
              showSearchUnavailable(resultsDiv);
            } else {
              showNoResults(resultsDiv);
            }
          }

          updateFooter(resultsDiv, true);
          saveSearchState("completed");
          return;
        }

        if (event.type === "error") {
          throw new Error("Search stream failed");
        }

        if (event.type === "fail") {
          failedCount++;
          updateFooter(resultsDiv, false);
          saveSearchState("searching");
          continue;
        }

        if (event.type === "message" && event.data !== "") {
          const item = JSON.parse(event.data);

          if (!insertSortedWithDOM(item, resultsDiv)) {
            failedCount++;
            updateFooter(resultsDiv, false);
          }

          saveSearchState("searching");
        }
      }
    }
  } catch (err) {
    if (controller.signal.aborted) return;

    saveSearchState("interrupted");

    if (currentResults.length === 0) {
      document.getElementById("results-footer").textContent = "";
      resultsDiv.textContent = "Error occurred.";
    } else {
      document.getElementById("results-footer").textContent =
        `Search interrupted. Run a new search to finish. (failed: ${failedCount})`;
    }
  } finally {
    if (searchAbortController === controller) {
      searchAbortController = null;
      isSearching = false;
      updateSearchControls();
    }
  }
}

/* ========================= */
/* THEME */
/* ========================= */

function updateThemeButton() {
  const button = document.getElementById("theme-button");

  if (!button) return;

  const isDark = document.body.classList.contains("dark");
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  button.textContent = isDark ? "☀️" : "🌙";
  button.title = label;
  button.setAttribute("aria-label", label);
}

function toggleTheme() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light",
  );

  updateThemeButton();
}

function loadTheme() {
  document.body.classList.toggle(
    "dark",
    localStorage.getItem("theme") === "dark",
  );

  updateThemeButton();
}

function changeNights(delta) {
  if (!isSearchAccessReady() || !searchAccess.policy.canSelectNights) {
    return;
  }
  const input = document.getElementById("nights");

  let value = Number(input.value) || 1;
  value += delta;

  if (value < 1) value = 1;
  if (value > maxNights) value = maxNights;

  input.value = value;
  saveSearchSetup();
}

function insertSortedWithDOM(item, container) {
  if (!isValidSearchResult(item)) return false;

  let index = 0;

  while (
    index < currentResults.length &&
    currentResults[index].price < item.price
  ) {
    index++;
  }

  // max results limit
  if (index >= maxResults) return true;

  currentResults.splice(index, 0, item);

  const node = createCard(item);

  // insert into DOM
  const cards = container.querySelectorAll(".card");

  if (index >= cards.length) {
    container.appendChild(node);
  } else {
    container.insertBefore(node, cards[index]);
  }

  if (node.classList?.contains("result-card")) {
    updateResultCardLayout(node);
    resultCardResizeObserver?.observe(node);
  }

  resultNodes.splice(index, 0, node);

  // cut off if more than maxResults
  if (currentResults.length > maxResults) {
    currentResults.pop();
    const removed = resultNodes.pop();
    resultCardResizeObserver?.unobserve(removed);
    removed.remove();
  }
  return true;
}

function createCard(r) {
  const div = document.createElement("div");

  const originCode =
    r.origin?.code ?? lastSearchParameters?.origin ?? defaultOrigin;
  const getCity = (code, city) => {
    if (typeof city === "string" && city.trim()) return city.trim();

    return (
      destinationsData.find((airport) => airport.value === code)?.label ?? code
    );
  };

  const isFlex = r.resultType === "flex";
  const isFallbackFlex = r.resultType === "fallback-flex";

  div.className = isFlex || isFallbackFlex ? "card flex-card" : "card";

  const route = document.createElement("div");
  route.className = "result-unit result-route";

  const title = document.createElement("strong");
  const origin = document.createElement("span");
  origin.className = "route-city";
  origin.textContent = `${getCity(originCode, r.origin?.city)}\u00a0(${originCode})`;

  const destination = document.createElement("span");
  destination.className = "route-city";
  destination.textContent = `${getCity(r.destination.code, r.destination.city)}\u00a0(${r.destination.code})`;

  title.append(origin, " → ", destination);

  route.appendChild(title);

  if (isFlex || isFallbackFlex) {
    const badge = document.createElement("span");
    badge.className = "flex-badge";
    badge.textContent = isFlex ? "Flexible Dates" : "Alternative Dates";

    route.append(badge);
  }

  const primaryRow = document.createElement("div");
  primaryRow.className = "result-row result-row-primary";

  const secondaryRow = document.createElement("div");
  secondaryRow.className = "result-row result-row-secondary";

  const dates = document.createElement("span");
  dates.className = "meta-info result-unit result-dates";
  dates.textContent = `${r.departure} → ${r.return}`;

  const price = document.createElement("strong");
  price.className = "result-unit result-unit--trailing result-price";
  price.textContent = `💶 ${r.currency} ${r.price.toLocaleString()}`;

  primaryRow.append(route, " ", price);
  secondaryRow.append(dates);

  if (isFlex && r.priceInsight) {
    const insight = document.createElement("span");
    insight.className = "result-unit result-unit--trailing price-insight";
    insight.textContent =
      `💡 ${r.priceInsight.percent}% cheaper than the original dates ` +
      `(${r.currency} ${r.priceInsight.basePrice.toLocaleString()})`;

    secondaryRow.append(" ", insight);
  }

  div.append(primaryRow, " ", secondaryRow);
  div.classList.add("result-card");

  div.addEventListener("click", () => openFlight(r));

  return div;
}

function updateResultCardLayout(card, observedWidth) {
  const style = getComputedStyle(card);
  const contentWidth =
    observedWidth ??
    card.clientWidth -
      parseFloat(style.paddingLeft) -
      parseFloat(style.paddingRight);

  if (contentWidth <= 0) return;

  if (
    card.dataset.layoutWidth === String(contentWidth) &&
    card.dataset.layout
  ) {
    return;
  }

  const units = [...card.querySelectorAll(".result-unit")];
  const unitWidths = new Map();

  units.forEach((unit) => {
    unit.style.removeProperty("font-size");
    unit.style.removeProperty("letter-spacing");
    unit.classList.remove("result-unit--wrapped");
    delete unit.dataset.scaled;
    const baseFontSize =
      Number(unit.dataset.baseFontSize) ||
      parseFloat(getComputedStyle(unit).fontSize);
    unit.dataset.baseFontSize = String(baseFontSize);
    unitWidths.set(unit, unit.getBoundingClientRect().width);
  });

  const primaryRow = card.querySelector(".result-row-primary");
  const secondaryRow = card.querySelector(".result-row-secondary");
  const rowFits = (row) => {
    const rowUnits = [...row.querySelectorAll(":scope > .result-unit")];
    const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    const requiredWidth =
      rowUnits.reduce((total, unit) => total + unitWidths.get(unit), 0) +
      Math.max(0, rowUnits.length - 1) * gap;

    return requiredWidth <= contentWidth;
  };
  const useDesktopLayout = rowFits(primaryRow) && rowFits(secondaryRow);

  card.dataset.layout = useDesktopLayout ? "desktop" : "mobile";
  card.dataset.layoutWidth = String(contentWidth);

  if (useDesktopLayout) return;

  units.forEach((unit) => {
    const naturalWidth = unitWidths.get(unit);
    if (naturalWidth <= contentWidth) return;

    const baseFontSize = Number(unit.dataset.baseFontSize);
    const minimumFontSize = 10;
    unit.style.fontSize = `${minimumFontSize}px`;

    if (unit.getBoundingClientRect().width > contentWidth) {
      let lowSpacing = -0.5;
      let highSpacing = 0;
      unit.style.letterSpacing = `${lowSpacing}px`;

      if (unit.getBoundingClientRect().width <= contentWidth) {
        for (let attempt = 0; attempt < 12; attempt++) {
          const candidate = (lowSpacing + highSpacing) / 2;
          unit.style.letterSpacing = `${candidate}px`;

          if (unit.getBoundingClientRect().width <= contentWidth) {
            lowSpacing = candidate;
          } else {
            highSpacing = candidate;
          }
        }
        unit.style.letterSpacing = `${lowSpacing}px`;
      }

      if (
        unit.getBoundingClientRect().width > contentWidth &&
        unit.classList.contains("price-insight")
      ) {
        unit.style.removeProperty("font-size");
        unit.style.removeProperty("letter-spacing");
        unit.classList.add("result-unit--wrapped");
      }

      unit.dataset.scaled = "true";
      return;
    }

    let low = minimumFontSize;
    let high = baseFontSize;
    for (let attempt = 0; attempt < 12; attempt++) {
      const candidate = (low + high) / 2;
      unit.style.fontSize = `${candidate}px`;

      if (unit.getBoundingClientRect().width <= contentWidth) {
        low = candidate;
      } else {
        high = candidate;
      }
    }

    unit.style.fontSize = `${low}px`;
    unit.dataset.scaled = "true";
  });
}

function getOrCreateFooter(container) {
  let el = document.getElementById("results-footer");
  const searchView = document.getElementById("search-view");
  const footerContainer =
    searchView && typeof searchView.appendChild === "function"
      ? searchView
      : container;

  if (!el) {
    el = document.createElement("div");
    el.id = "results-footer";
    el.className = "meta-info";
  }

  if (
    el.parentElement !== footerContainer &&
    typeof footerContainer.appendChild === "function"
  ) {
    footerContainer.appendChild(el);
  }

  if (el.textContent === "") {
    el.hidden = true;
  } else {
    el.hidden = false;
  }

  return el;
}

function updateFooter(container, isDone = false) {
  const el = getOrCreateFooter(container);
  el.hidden = false;

  if (isDone) {
    el.textContent = `Finished...(failed: ${failedCount})`;
  } else {
    el.textContent = `Loading... (fails: ${failedCount})`;
  }
}

function initFooter(container) {
  const el = getOrCreateFooter(container);
  el.hidden = false;
  el.textContent = "Loading...";
}

function showNoResults(container) {
  const noResults = document.createElement("div");

  noResults.className = "card no-results-card";
  noResults.innerHTML = `
    <strong>No flights found</strong><br/>
    <span class="meta-info">
      Try different dates, more nights, or another destination.
    </span>
  `;

  container.appendChild(noResults);
}

function showSearchUnavailable(container) {
  const message = document.createElement("div");

  message.className = "card error-card search-unavailable-card";
  message.innerHTML = `
    <strong>Search results unavailable</strong><br/>
    <span class="meta-info">
      Some flight searches failed and no results could be displayed.
      Please try again.
    </span>
  `;

  container.appendChild(message);
}

function openFlight(r) {
  const url = getSafeBookingUrl(r.bookingUrl);

  if (!url) return;

  window.open(url, "_blank", "noopener,noreferrer");
}
