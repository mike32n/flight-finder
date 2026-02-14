async function search() {
  const destinations = document
    .getElementById("destinations")
    .value.split(",")
    .map(d => d.trim());

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
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ destinations, weekday, nights })
    });

    const data = await res.json();

    loading.classList.add("hidden");

    data.results.forEach(r => {
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
