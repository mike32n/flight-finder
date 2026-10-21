(() => {
  const plans = ["anonymous", "registered", "premium"];

  const weekdays = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  const fields = [
    {
      key: "canSelectOrigin",
      label: "Choose departure airport",
      type: "boolean",
    },
    {
      key: "maxDestinations",
      label: "Maximum destinations",
      type: "number",
    },
    {
      key: "canSelectWeekday",
      label: "Choose departure weekday",
      type: "boolean",
    },
    {
      key: "fixedWeekday",
      label: "Fixed weekday (when locked)",
      type: "weekday",
    },
    {
      key: "canSelectNights",
      label: "Choose number of nights",
      type: "boolean",
    },
    {
      key: "fixedNights",
      label: "Fixed nights (when locked)",
      type: "number",
    },
    {
      key: "canSelectStartDate",
      label: "Choose search start date",
      type: "boolean",
    },
    {
      key: "smartFlexEnabled",
      label: "Smart Flex",
      type: "boolean",
    },
    {
      key: "searchHistoryEnabled",
      label: "Search history",
      type: "boolean",
    },
    {
      key: "favouritesEnabled",
      label: "Favourites",
      type: "boolean",
    },
    {
      key: "adsEnabled",
      label: "Advertisements",
      type: "boolean",
    },
  ];

  function hasValidPolicies(policies) {
    if (!policies || typeof policies !== "object") return false;

    return plans.every((plan) => {
      const policy = policies[plan];

      if (!policy || typeof policy !== "object") return false;

      return fields.every((field) => {
        const value = policy[field.key];

        if (field.type === "boolean") {
          return typeof value === "boolean";
        }

        if (field.type === "weekday") {
          return Number.isInteger(value) && value >= 0 && value <= 6;
        }

        return Number.isInteger(value) && value > 0;
      });
    });
  }

  function formatValue(field, value) {
    if (field.type === "boolean") {
      return value ? "Yes" : "No";
    }

    if (field.type === "weekday") {
      return weekdays[value];
    }

    return String(value);
  }

  function renderPolicies(policies) {
    const fragment = document.createDocumentFragment();

    for (const field of fields) {
      const row = document.createElement("tr");
      const heading = document.createElement("th");

      heading.scope = "row";
      heading.textContent = field.label;
      row.appendChild(heading);

      for (const plan of plans) {
        const cell = document.createElement("td");

        cell.textContent = formatValue(field, policies[plan][field.key]);
        row.appendChild(cell);
      }

      fragment.appendChild(row);
    }

    document.getElementById("plan-policies-body").replaceChildren(fragment);
  }

  function showError(message) {
    const status = document.getElementById("admin-status");

    status.textContent = message;
    status.dataset.state = "error";
    status.hidden = false;

    document.getElementById("admin-content").hidden = true;
  }

  async function loadPolicies() {
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        showError("Please sign in to access administration.");
        return;
      }

      const response = await fetch("/api/admin/plan-policies", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        showError("Your session has expired. Please sign in again.");
        return;
      }

      if (response.status === 403) {
        showError("Admin access required.");
        return;
      }

      if (!response.ok) {
        throw new Error("Plan policy request failed.");
      }

      const data = await response.json();

      if (data?.success !== true || !hasValidPolicies(data.policies)) {
        throw new Error("Invalid plan policy response.");
      }

      renderPolicies(data.policies);

      document.getElementById("admin-status").hidden = true;
      document.getElementById("admin-content").hidden = false;
    } catch {
      showError(
        "Plan policies could not be loaded. Please reload to try again.",
      );
    }
  }

  document.addEventListener("DOMContentLoaded", loadPolicies);
})();
