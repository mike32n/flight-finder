let destinationsData = [];
let selectedDestinations = [];
let maxDestinations = 3;

let currentFocus = -1;
let debounceTimer;

/* ========================= */
/* INIT */
/* ========================= */

window.onload = async function () {
  const res = await fetch("/destinations");
  destinationsData = await res.json();

  try {
    const configRes = await fetch("/config");
    const config = await configRes.json();
    maxDestinations = config.maxDestinations;
  } catch {}

  setupAutocomplete();
  loadTheme();
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

function highlightMatch(text, query) {
  const regex = new RegExp(`(${query})`, "gi");
  return text.replace(regex, `<strong>$1</strong>`);
}

/* ========================= */
/* DROPDOWN */
/* ========================= */

function openDropdown(list) {
  list.classList.remove("hidden");
  requestAnimationFrame(() => list.classList.add("open"));
}

function closeDropdown(list) {
  list.classList.remove("open");
  setTimeout(() => list.classList.add("hidden"), 150);
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

  /* 🔥 EZ A LÉNYEG: mindig látható legyen */
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

  const loading = document.getElementById("loading");
  const resultsDiv = document.getElementById("results");

  loading.classList.remove("hidden");
  resultsDiv.innerHTML = "";

  try {
    const res = await fetch("/search", {
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

    const data = await res.json();
    loading.classList.add("hidden");

    data.results.forEach((r) => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <strong>${r.destination}</strong><br/>
        ${r.departure} → ${r.return}<br/>
        💶 ${r.price}
      `;
      resultsDiv.appendChild(div);
    });

    const failed = document.createElement("div");
    failed.innerHTML = `<p class="meta-info">Failed requests: ${data.failedRequests}</p>`;
    resultsDiv.appendChild(failed);
  } catch {
    loading.classList.add("hidden");
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
  let value = Number(input.value) || 0;
  value += delta;
  if (value < 0) value = 0;
  input.value = value;
}
