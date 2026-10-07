let destinationsData = [];
let selectedDestinations = [];
let maxDestinations = 3;
let maxNights = 30;
let maxResults = 5;

let currentFocus = -1;
let debounceTimer;
let dropdownCloseTimer;

let currentResults = [];
let failedCount = 0;
let resultNodes = [];

window.emailVerificationRequired = true;

/* ========================= */
/* INIT */
/* ========================= */

window.onload = async function () {
  const res = await fetch("/destinations");
  destinationsData = await res.json();

  try {
    const configRes = await fetch("/config");

    if (!configRes.ok) {
      throw new Error(`Config request failed: ${configRes.status}`);
    }

    const config = await configRes.json();

    maxDestinations = config.destinations.maxSelected ?? maxDestinations;
    maxNights = config.search.maxNights ?? maxNights;
    maxResults = config.search.maxResults ?? maxResults;

    window.emailVerificationRequired =
      config.auth?.emailVerificationRequired ?? true;
  } catch (err) {
    console.error("Failed to load config:", err);
  }

  setupAutocomplete();
  loadTheme();

  const nightsInput = document.getElementById("nights");

  nightsInput.addEventListener("input", () => {
    let value = Number(nightsInput.value);

    if (!value || value < 1) {
      value = 1;
    }
    if (value > maxNights) value = maxNights;

    nightsInput.value = value;
  });

  await loadCurrentUser();
  renderAuthUI();
};

/* ========================= */
/* AUTOCOMPLETE */
/* ========================= */

function setupAutocomplete() {
  const input = document.getElementById("destination-input");
  const list = document.getElementById("autocomplete-list");

  input.addEventListener("input", function () {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const value = this.value.toLowerCase();
      list.innerHTML = "";
      currentFocus = -1;

      if (!value) {
        closeDropdown(list);
        return;
      }

      const filtered = destinationsData.filter(
        (d) =>
          d.label.toLowerCase().includes(value) ||
          d.value.toLowerCase().includes(value),
      );

      filtered.forEach((dest) => {
        const item = document.createElement("div");
        item.className = "autocomplete-item";

        item.innerHTML = highlightMatch(`${dest.label} (${dest.value})`, value);

        item.addEventListener("click", () => {
          selectDestination(dest);
        });

        list.appendChild(item);
      });

      filtered.length ? openDropdown(list) : closeDropdown(list);
    }, 120); // debounce
  });

  input.addEventListener("keydown", function (e) {
    const items = list.getElementsByClassName("autocomplete-item");

    if (e.key === "ArrowDown") {
      currentFocus++;
      addActive(items);
    } else if (e.key === "ArrowUp") {
      currentFocus--;
      addActive(items);
    } else if (e.key === "Enter") {
      e.preventDefault();

      if (currentFocus === -1 && items.length > 0) {
        items[0].click();
      } else if (items[currentFocus]) {
        items[currentFocus].click();
      }
    } else if (e.key === "Escape") {
      closeDropdown(list);
    }
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".autocomplete-wrapper")) {
      closeDropdown(list);
    }
  });
}

/* ========================= */
/* HELPERS */
/* ========================= */

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text, query) {
  const regex = new RegExp(`(${escapeRegExp(query)})`, "gi");
  return text.replace(regex, "<strong>$1</strong>");
}

/* ========================= */
/* DROPDOWN */
/* ========================= */

function openDropdown(list) {
  clearTimeout(dropdownCloseTimer);

  list.classList.remove("hidden");

  requestAnimationFrame(() => {
    list.classList.add("open");
  });
}

function closeDropdown(list) {
  list.classList.remove("open");

  clearTimeout(dropdownCloseTimer);

  dropdownCloseTimer = setTimeout(() => {
    list.classList.add("hidden");
  }, 150);
}

/* ========================= */
/* KEYBOARD */
/* ========================= */

function addActive(items) {
  if (!items || items.length === 0) return;

  removeActive(items);

  if (currentFocus >= items.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = items.length - 1;

  const activeItem = items[currentFocus];
  activeItem.classList.add("active");

  /* always visible */
  activeItem.scrollIntoView({
    block: "nearest",
    behavior: "auto",
  });
}

function removeActive(items) {
  for (let item of items) {
    item.classList.remove("active");
  }
}

/* ========================= */
/* DESTINATIONS */
/* ========================= */

function selectDestination(dest) {
  if (selectedDestinations.length >= maxDestinations) return;
  if (selectedDestinations.includes(dest.value)) return;

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

    badge.addEventListener("click", () => {
      selectedDestinations = selectedDestinations.filter((c) => c !== code);
      renderSelected();
    });

    container.appendChild(badge);
  });

  document.getElementById("destination-input").disabled =
    selectedDestinations.length >= maxDestinations;
}

/* ========================= */
/* SEARCH */
/* ========================= */

async function search() {
  const weekday = Number(document.getElementById("weekday").value);
  const nights = Number(document.getElementById("nights").value);

  const container = document.getElementById("selected-container");
  const resultsDiv = document.getElementById("results");

  // validation FIRST
  if (selectedDestinations.length === 0) {
    container.innerHTML = `
    <div class="card error-card">
      ⚠️ Please select destination airport(s)
    </div>
  `;
    return;
  }

  resultsDiv.innerHTML = "";

  // footer reset
  initFooter(resultsDiv);

  // STATE
  currentResults = [];
  failedCount = 0;
  resultNodes = [];

  try {
    const response = await fetch("/search-stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        destinations: selectedDestinations,
        weekday,
        nights,
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
      if (done) {
        throw new Error("Search stream ended unexpectedly.");
      }

      buffer += decoder.decode(value, { stream: true });

      const parts = buffer.split("\n\n");
      buffer = parts.pop();

      for (const part of parts) {
        if (part.includes("event: end")) {
          if (currentResults.length === 0) {
            showNoResults(resultsDiv);
          }

          updateFooter(resultsDiv, true);
          return;
        }

        if (part.includes("event: error")) {
          throw new Error("Search stream failed");
        }

        if (part.includes("event: fail")) {
          failedCount++;
          updateFooter(resultsDiv, false);
          continue;
        }

        if (part.includes("data:")) {
          const jsonStr = part.split("data: ")[1];
          if (!jsonStr) continue;

          const item = JSON.parse(jsonStr);

          insertSortedWithDOM(item, resultsDiv);
        }
      }
    }
  } catch (err) {
    resultsDiv.innerHTML = "Error occurred.";
  }
}

/* ========================= */
/* THEME */
/* ========================= */

function toggleTheme() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light",
  );
}

function loadTheme() {
  if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark");
  }
}

function changeNights(delta) {
  const input = document.getElementById("nights");

  let value = Number(input.value) || 1;
  value += delta;

  if (value < 1) value = 1;
  if (value > maxNights) value = maxNights;

  input.value = value;
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
    <strong>→ ${r.destination.city} (${r.destination.code})</strong>
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

function openFlight(r) {
  const url = r.bookingUrl;

  window.open(url, "_blank");
}
