let destinationsData = [];
let selectedDestinations = [];
let maxDestinations = 3;

let currentFocus = -1;

window.onload = async function () {
  const res = await fetch("/destinations");
  destinationsData = await res.json();

  // ha később lesz config endpoint:
  try {
    const configRes = await fetch("/config");
    const config = await configRes.json();
    maxDestinations = config.maxDestinations;
  } catch {}

  setupAutocomplete();
};

function setupAutocomplete() {
  const input = document.getElementById("destination-input");
  const list = document.getElementById("autocomplete-list");

  input.addEventListener("input", function () {
    const value = this.value.toLowerCase();
    list.innerHTML = "";
    currentFocus = -1;

    if (!value) {
      list.classList.add("hidden");
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
      item.textContent = `${dest.label} (${dest.value})`;

      item.addEventListener("click", () => {
        selectDestination(dest);
      });

      list.appendChild(item);
    });

    list.classList.toggle("hidden", filtered.length === 0);
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
      if (currentFocus > -1 && items[currentFocus]) {
        items[currentFocus].click();
      }
    }
  });
}

function addActive(items) {
  if (!items) return;

  removeActive(items);

  if (currentFocus >= items.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = items.length - 1;

  items[currentFocus].classList.add("active");
}

function removeActive(items) {
  for (let item of items) {
    item.classList.remove("active");
  }
}

function selectDestination(dest) {
  if (selectedDestinations.length >= maxDestinations) return;

  if (selectedDestinations.includes(dest.value)) return;

  selectedDestinations.push(dest.value);
  renderSelected();

  document.getElementById("destination-input").value = "";
  document.getElementById("autocomplete-list").classList.add("hidden");
}

function renderSelected() {
  const container = document.getElementById("selected-container");
  container.innerHTML = "";

  selectedDestinations.forEach((code) => {
    const badge = document.createElement("div");
    badge.className = "iata-badge";
    badge.textContent = code;

    badge.addEventListener("click", () => {
      selectedDestinations = selectedDestinations.filter(
        (c) => c !== code,
      );
      renderSelected();
    });

    container.appendChild(badge);
  });

  const input = document.getElementById("destination-input");
  input.disabled = selectedDestinations.length >= maxDestinations;
}

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
  } catch (err) {
    loading.classList.add("hidden");
    resultsDiv.innerHTML = "Error occurred.";
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");

  localStorage.setItem(
    "theme",
    document.body.classList.contains("dark") ? "dark" : "light"
  );
}

(function loadTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.body.classList.add("dark");
  }
})();
