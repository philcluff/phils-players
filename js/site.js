(function () {
  var STORAGE_KEY = "phils-player-theme";
  var root = document.documentElement;
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function savedTheme() {
    try {
      var value = localStorage.getItem(STORAGE_KEY);
      if (value === "dark") return "dark";
      if (value === "default") return "light";
    } catch (e) {}
    return null;
  }

  function systemTheme() {
    return darkQuery.matches ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var toggles = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < toggles.length; i++) {
      var target = theme === "dark" ? "light" : "dark";
      toggles[i].setAttribute("aria-label", "Switch to " + target + " theme");
      toggles[i].querySelector("[data-theme-toggle-label]").textContent = target === "dark" ? "Dark" : "Light";
    }
  }

  function toggleTheme() {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(STORAGE_KEY, next === "dark" ? "dark" : "default");
    } catch (e) {}
    applyTheme(next);
  }

  applyTheme(savedTheme() || systemTheme());

  darkQuery.addEventListener("change", function () {
    if (!savedTheme()) applyTheme(systemTheme());
  });

  var tailwindTheme = document.createElement("style");
  tailwindTheme.type = "text/tailwindcss";
  tailwindTheme.textContent = [
    "@theme inline {",
    "  --font-sans: 'Archivo', ui-sans-serif, system-ui, sans-serif;",
    "  --font-mono: 'Fragment Mono', ui-monospace, SFMono-Regular, Menlo, monospace;",
    "  --color-paper: var(--paper);",
    "  --color-panel: var(--panel);",
    "  --color-ink: var(--ink);",
    "  --color-muted: var(--muted);",
    "  --color-rule: var(--rule);",
    "  --color-focus: var(--focus);",
    "  --color-amber: var(--amber);",
    "  --color-amber-hover: var(--amber-hover);",
    "  --color-amber-ink: var(--amber-ink);",
    "  --color-tally-red: var(--tally-red);",
    "  --color-tally-green: var(--tally-green);",
    "}"
  ].join("\n");
  document.head.appendChild(tailwindTheme);

  var TALLY_STATES = {
    emptied: "idle",
    play: "loading",
    waiting: "loading",
    playing: "playing",
    pause: "paused",
    ended: "ended",
    error: "error"
  };
  var TALLY_LABELS = {
    idle: "Idle",
    loading: "Loading",
    playing: "Playing",
    paused: "Paused",
    ended: "Ended",
    error: "Error"
  };

  function setTally(state) {
    var tallies = document.querySelectorAll("[data-tally]");
    for (var i = 0; i < tallies.length; i++) {
      tallies[i].setAttribute("data-state", state);
      var label = tallies[i].querySelector("[data-tally-label]");
      if (label) label.textContent = TALLY_LABELS[state];
    }
  }

  Object.keys(TALLY_STATES).forEach(function (eventName) {
    document.addEventListener(eventName, function (event) {
      if (event.target instanceof HTMLMediaElement || (event.target.tagName || "").indexOf("-") > 0) {
        setTally(TALLY_STATES[eventName]);
      }
    }, true);
  });

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(root.getAttribute("data-theme"));
    var toggles = document.querySelectorAll("[data-theme-toggle]");
    for (var i = 0; i < toggles.length; i++) {
      toggles[i].addEventListener("click", toggleTheme);
    }
    setTally("idle");
  });
})();
