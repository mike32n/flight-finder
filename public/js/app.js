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

window.onload = async function () {
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

  await loadCurrentUser();
  renderAuthUI();

  restoreSearchSetup();
  restoreSearchState();

  document.getElementById("origin-input").disabled =
    destinationsData.length === 0;
  document.getElementById("destination-input").disabled =
    destinationsData.length === 0 ||
    selectedDestinations.length >= maxDestinations;
  document.getElementById("search-button").disabled =
    destinationsData.length === 0;
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

function showSearchValidationError(message = "") {
  const container = document.getElementById("selected-container");

  if (!message) {
    if (container.querySelector(".error-card")) {
      renderSelected();
    }
    return;
  }

  const error = document.createElement("div");

  error.id = "search-validation-error";
  error.className = "card error-card";
  error.textContent = message;
  error.tabIndex = 0;
  error.setAttribute("role", "alert");
  error.title = "Click to dismiss";

  error.addEventListener("click", () => {
    renderSelected();
  });

  error.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      renderSelected();
    }
  });

  container.replaceChildren(error);
}

function renderOrigin() {
  const code = document.getElementById("origin").value;
  const airport = departureAirports.find((item) => item.code === code);
  document.getElementById("origin-input").value = airport
    ? `${airport.city} (${code})`
    : code;
}

function selectOriginAirport(airport) {
  if (selectedDestinations.includes(airport.value)) return;
  if (!destinationsData.some((item) => item.value === airport.value)) return;
  document.getElementById("origin").value = airport.value;
  renderOrigin();
  destinationAutocomplete?.close();
  showSearchValidationError();
  saveSearchSetup();
}

function selectDestination(dest) {
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

  document.getElementById("destination-input").disabled =
    destinationsData.length === 0 ||
    selectedDestinations.length >= maxDestinations;

  originAutocomplete?.refresh();
  showSearchValidationError();
  saveSearchSetup();
}

/* ========================= */
/* SEARCH */
/* ========================= */

function saveSearchState(status) {
  if (!lastSearchParameters) return;

  try {
    sessionStorage.setItem(
      SEARCH_STATE_KEY,
      JSON.stringify({
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

  document.getElementById("results").innerHTML = "";

  try {
    sessionStorage.removeItem(SEARCH_STATE_KEY);
  } catch (error) {
    console.warn("Could not clear saved search results:", error);
  }
}

function restoreSearchState() {
  try {
    const stored = sessionStorage.getItem(SEARCH_STATE_KEY);
    if (!stored) return;

    const saved = JSON.parse(stored);

    if (
      !Array.isArray(saved.results) ||
      !Array.isArray(saved.parameters?.destinations) ||
      !Number.isInteger(saved.failedCount) ||
      saved.failedCount < 0 ||
      !["searching", "completed", "interrupted"].includes(saved.status)
    ) {
      clearSearchResults();
      return;
    }

    lastSearchParameters = saved.parameters;
    failedCount = saved.failedCount;

    const resultsDiv = document.getElementById("results");

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
    timestamp.className = "meta-info";
    timestamp.textContent = `Saved search: ${new Date(saved.parameters.startedAt).toLocaleString()}.`;

    const priceNotice = document.createElement("div");
    priceNotice.textContent = "Prices may have changed.";
    timestamp.appendChild(priceNotice);

    resultsDiv.appendChild(timestamp);
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

async function search() {
  if (isSearching) return;

  const origin = document.getElementById("origin").value;
  const weekday = Number(document.getElementById("weekday").value);
  const nights = Number(document.getElementById("nights").value);
  const startDateInput = document.getElementById("start-date");
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

  lastSearchParameters = {
    origin,
    destinations: [...selectedDestinations],
    weekday,
    nights,
    startDate,
    startedAt: new Date().toISOString(),
  };

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

    const response = await fetch("/search-stream", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        origin: lastSearchParameters.origin,
        destinations: lastSearchParameters.destinations,
        weekday,
        nights,
        startDate: lastSearchParameters.startDate,
      }),
    });

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (controller.signal.aborted) return;
      if (done) {
        throw new Error("Search stream ended unexpectedly.");
      }

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop();

      for (const part of parts) {
        if (part.includes("event: end")) {
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

        if (part.includes("event: error")) {
          throw new Error("Search stream failed");
        }

        if (part.includes("event: fail")) {
          failedCount++;
          updateFooter(resultsDiv, false);
          saveSearchState("searching");
          continue;
        }

        if (part.includes("data:")) {
          const jsonStr = part.split("data: ")[1];
          if (!jsonStr) continue;

          const item = JSON.parse(jsonStr);

          insertSortedWithDOM(item, resultsDiv);
          saveSearchState("searching");
        }
      }
    }
  } catch (err) {
    if (controller.signal.aborted) return;

    saveSearchState("interrupted");

    if (currentResults.length === 0) {
      resultsDiv.textContent = "Error occurred.";
    } else {
      document.getElementById("results-footer").textContent =
        `Search interrupted. Run a new search to finish. (failed: ${failedCount})`;
    }
  } finally {
    if (searchAbortController === controller) {
      searchAbortController = null;
    }

    isSearching = false;
    searchButton.disabled = false;
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
  const input = document.getElementById("nights");

  let value = Number(input.value) || 1;
  value += delta;

  if (value < 1) value = 1;
  if (value > maxNights) value = maxNights;

  input.value = value;
  saveSearchSetup();
}

function insertSortedWithDOM(item, container) {
  let index = 0;

  while (
    index < currentResults.length &&
    currentResults[index].price < item.price
  ) {
    index++;
  }

  // max results limit
  if (index >= maxResults) return;

  currentResults.splice(index, 0, item);

  const node = createCard(item);

  // insert into DOM
  const cards = container.querySelectorAll(".card");
  const footer = document.getElementById("results-footer");

  if (index >= cards.length) {
    container.insertBefore(node, footer);
  } else {
    container.insertBefore(node, cards[index]);
  }

  resultNodes.splice(index, 0, node);

  // cut off if more than maxResults
  if (currentResults.length > maxResults) {
    currentResults.pop();
    const removed = resultNodes.pop();
    removed.remove();
  }
}

function createCard(r) {
  const div = document.createElement("div");

  const originCode =
    r.origin?.code ?? lastSearchParameters?.origin ?? defaultOrigin;

  const isFlex = r.resultType === "flex";
  const isFallbackFlex = r.resultType === "fallback-flex";

  div.className = isFlex || isFallbackFlex ? "card flex-card" : "card";

  let badge = "";

  if (isFlex) {
    badge = '<span class="flex-badge">Flexible dates</span>';
  } else if (isFallbackFlex) {
    badge = '<span class="flex-badge">Alternative dates</span>';
  }

  let priceInsight = "";

  if (isFlex && r.priceInsight) {
    priceInsight = `
    <br/>
    <span class="price-insight">
      💡 ${r.priceInsight.percent}% cheaper than the original dates
      (${r.currency} ${r.priceInsight.basePrice.toLocaleString()})
    </span>
  `;
  }

  div.innerHTML = `
    <strong>${originCode} → ${r.destination.city} (${r.destination.code})</strong>
    ${badge}<br/>
    <span class="meta-info">
      ${r.departure} → ${r.return}
    </span><br/>
    💶 ${r.currency} ${r.price.toLocaleString()}
    ${priceInsight}
  `;

  div.addEventListener("click", () => {
    openFlight(r);
  });

  return div;
}

function updateFooter(container, isDone = false) {
  let el = document.getElementById("results-footer");

  if (!el) {
    el = document.createElement("div");
    el.id = "results-footer";
    el.className = "meta-info";
    container.appendChild(el);
  }

  if (isDone) {
    el.textContent = `Finished...(failed: ${failedCount})`;
  } else {
    el.textContent = `Loading... (fails: ${failedCount})`;
  }
}

function initFooter(container) {
  let el = document.getElementById("results-footer");

  if (!el) {
    el = document.createElement("div");
    el.id = "results-footer";
    el.className = "meta-info";
    container.appendChild(el);
  }

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

  const footer = document.getElementById("results-footer");
  container.insertBefore(noResults, footer);
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

  const footer = document.getElementById("results-footer");
  container.insertBefore(message, footer);
}

function openFlight(r) {
  const url = r.bookingUrl;

  window.open(url, "_blank");
}
