(() => {
  const plans = ["anonymous", "registered", "premium"];

  const planLabels = {
    anonymous: "Anonymous",
    registered: "Registered",
    premium: "Premium",
  };

  let canEdit = false;
  let isSaving = false;

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

  function hasValidPolicy(policy) {
    if (!policy || typeof policy !== "object" || Array.isArray(policy)) {
      return false;
    }

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
  }

  function hasValidPolicies(policies) {
    return (
      policies &&
      typeof policies === "object" &&
      plans.every((plan) => hasValidPolicy(policies[plan]))
    );
  }

  function createPolicyControl(field, plan, value) {
    const control = document.createElement(
      field.type === "weekday" ? "select" : "input",
    );

    control.id = `${plan}-${field.key}`;
    control.name = field.key;
    control.setAttribute("form", `policy-form-${plan}`);
    control.setAttribute("aria-label", `${planLabels[plan]}: ${field.label}`);

    if (field.type === "boolean") {
      control.type = "checkbox";
      control.checked = value;
    } else if (field.type === "weekday") {
      weekdays.forEach((label, index) => {
        const option = document.createElement("option");

        option.value = String(index);
        option.textContent = label;
        control.appendChild(option);
      });

      control.value = String(value);
      control.required = true;
    } else {
      control.type = "number";
      control.min = "1";
      control.step = "1";
      control.required = true;
      control.value = String(value);
    }

    return control;
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

        cell.appendChild(
          createPolicyControl(field, plan, policies[plan][field.key]),
        );
        row.appendChild(cell);
      }

      fragment.appendChild(row);
    }

    document.getElementById("plan-policies-body").replaceChildren(fragment);
  }

  function showError(message) {
    canEdit = false;
    setControlsDisabled(true);
    const status = document.getElementById("admin-status");

    status.textContent = message;
    status.dataset.state = "error";
    status.hidden = false;

    document.getElementById("admin-content").hidden = true;
  }

  function setControlsDisabled(disabled) {
    document
      .querySelectorAll(
        "#admin-content input, #admin-content select, #admin-content button",
      )
      .forEach((control) => {
        control.disabled = disabled;
      });
  }

  function showSaveStatus(plan, message, state) {
    const status = document.getElementById(`${plan}-save-status`);

    status.textContent = message;
    status.dataset.state = state;
  }

  function readPolicy(plan) {
    return Object.fromEntries(
      fields.map((field) => {
        const control = document.getElementById(`${plan}-${field.key}`);

        const value =
          field.type === "boolean" ? control.checked : Number(control.value);

        return [field.key, value];
      }),
    );
  }

  function applyPolicy(plan, policy) {
    for (const field of fields) {
      const control = document.getElementById(`${plan}-${field.key}`);

      if (field.type === "boolean") {
        control.checked = policy[field.key];
      } else {
        control.value = String(policy[field.key]);
      }
    }
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
      canEdit = true;
      setControlsDisabled(false);

      document.getElementById("admin-status").hidden = true;
      document.getElementById("admin-content").hidden = false;
    } catch {
      showError(
        "Plan policies could not be loaded. Please reload to try again.",
      );
    }
  }

  async function savePolicy(plan) {
    if (!canEdit || isSaving) return;

    const form = document.getElementById(`policy-form-${plan}`);

    if (!form.reportValidity()) return;

    const policy = readPolicy(plan);

    isSaving = true;
    setControlsDisabled(true);
    showSaveStatus(plan, "Saving...", "saving");

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        showError("Please sign in to access administration.");
        return;
      }

      const response = await fetch(`/api/admin/plan-policies/${plan}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(policy),
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

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          response.status >= 400 &&
          response.status < 500 &&
          typeof data?.message === "string"
            ? data.message
            : "Changes could not be saved. Please try again.";

        showSaveStatus(plan, message, "error");
        return;
      }

      if (
        data?.success !== true ||
        data.plan !== plan ||
        !hasValidPolicy(data.policy)
      ) {
        throw new Error("Invalid save response.");
      }

      applyPolicy(plan, data.policy);
      showSaveStatus(plan, "Saved.", "success");
    } catch {
      showSaveStatus(
        plan,
        "Changes could not be saved. Please try again.",
        "error",
      );
    } finally {
      isSaving = false;
      setControlsDisabled(!canEdit);
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    for (const plan of plans) {
      document
        .getElementById(`policy-form-${plan}`)
        .addEventListener("submit", (event) => {
          event.preventDefault();
          void savePolicy(plan);
        });
    }

    void loadPolicies();
  });
})();
