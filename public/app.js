window.onload = async function () {
  const res = await fetch("/destinations");
  const data = await res.json();

  const select = document.getElementById("destinations");

  data.forEach((dest) => {
    const option = document.createElement("option");
    option.value = dest.name;
    option.textContent = dest.name;
    select.appendChild(option);
  });
};

async function search() {
  const selectedOptions = Array.from(
    document.getElementById("destinations").selectedOptions,
  );

  const destinations = selectedOptions.map((opt) => opt.value);

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
      body: JSON.stringify({ destinations, weekday, nights }),
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
    failed.innerHTML = `<p>Failed requests: ${data.failedRequests}</p>`;
    resultsDiv.appendChild(failed);
  } catch (err) {
    loading.classList.add("hidden");
    resultsDiv.innerHTML = "Error occurred.";
  }
}
