(function () {
  "use strict";

  // ── Live meta config ──────────────────────────────────────────────
  // Paste your Cloudflare Worker URL here (no trailing slash). Until you
  // set this, the meta panel shows a friendly "not configured" message
  // instead of erroring.
  var META_WORKER_URL = "https://akari-aim-meta.pierluigisassanelli98.workers.dev"; // Cloudflare Worker
  var META_REFRESH_MS = 60000; // re-fetch every 60s
  // ──────────────────────────────────────────────────────────────────

  // Apex Legends yaw constant (degrees turned per mouse count at sensitivity 1)
  var APEX_YAW = 0.022;
  var ZOOMS = ["1×", "2×", "3×", "4×", "6×", "8×", "10×"];

  var currentHipfire = null;
  var currentDpi = null;

  var el = {
    refDpi: document.getElementById("refDpi"),
    refSens: document.getElementById("refSens"),
    yourDpi: document.getElementById("yourDpi"),
    refStat: document.getElementById("refStat"),
    refCm360: document.getElementById("refCm360"),
    resultEmpty: document.getElementById("resultEmpty"),
    resultCard: document.getElementById("resultCard"),
    yourSensVal: document.getElementById("yourSensVal"),
    yourCm360Label: document.getElementById("yourCm360Label"),
    copyBtn: document.getElementById("copyBtn"),
    adsRows: document.getElementById("adsRows")
  };

  // cm to complete a 360° turn, given a sensitivity and DPI
  function cm360(sens, dpi) {
    return (360 * 2.54) / (sens * dpi * APEX_YAW);
  }

  // trim trailing zeros, cap at 4 decimals
  function fmtSens(n) {
    return parseFloat(n.toFixed(4)).toString();
  }

  function num(input) {
    var v = parseFloat(input.value);
    return isNaN(v) ? null : v;
  }

  function buildAdsRows() {
    var frag = document.createDocumentFragment();
    ZOOMS.forEach(function (zoom, i) {
      var row = document.createElement("div");
      row.className = "ads-row";
      row.innerHTML =
        '<span class="ads-zoom">' + zoom + "</span>" +
        '<input type="number" inputmode="decimal" step="0.01" min="0.01" max="2" autocomplete="off" data-ads="' + i + '">' +
        '<span class="ads-out" data-eff="' + i + '">—</span>' +
        '<span class="ads-out" data-cm="' + i + '">—</span>';
      frag.appendChild(row);
    });
    el.adsRows.appendChild(frag);
    el.adsRows.addEventListener("input", updateAds);
  }

  function updateAds() {
    for (var i = 0; i < ZOOMS.length; i++) {
      var input = el.adsRows.querySelector('[data-ads="' + i + '"]');
      var effEl = el.adsRows.querySelector('[data-eff="' + i + '"]');
      var cmEl = el.adsRows.querySelector('[data-cm="' + i + '"]');
      var mult = parseFloat(input.value);

      if (mult > 0 && currentHipfire && currentDpi) {
        var eff = currentHipfire * mult;
        effEl.textContent = fmtSens(eff);
        cmEl.textContent = cm360(eff, currentDpi).toFixed(2);
        effEl.classList.add("filled");
        cmEl.classList.add("filled");
      } else {
        effEl.textContent = "—";
        cmEl.textContent = "—";
        effEl.classList.remove("filled");
        cmEl.classList.remove("filled");
      }
    }
  }

  function update() {
    var refDpi = num(el.refDpi);
    var refSens = num(el.refSens);
    var yourDpi = num(el.yourDpi);

    var refValid = refSens > 0 && refDpi > 0;
    var allValid = refValid && yourDpi > 0;

    if (refValid) {
      el.refCm360.textContent = cm360(refSens, refDpi).toFixed(2) + " cm";
      el.refStat.hidden = false;
    } else {
      el.refStat.hidden = true;
    }

    if (allValid) {
      var yourSens = refSens * (refDpi / yourDpi);
      currentHipfire = yourSens;
      currentDpi = yourDpi;
      el.yourSensVal.textContent = fmtSens(yourSens);
      el.yourCm360Label.textContent =
        cm360(yourSens, yourDpi).toFixed(2) + " cm per 360° — matches the reference";
      el.resultEmpty.hidden = true;
      el.resultCard.hidden = false;
    } else {
      currentHipfire = null;
      currentDpi = null;
      el.resultEmpty.hidden = false;
      el.resultCard.hidden = true;
    }

    updateAds();
  }

  function copyValue() {
    var val = el.yourSensVal.textContent;
    if (!val) return;
    navigator.clipboard.writeText(val).then(function () {
      el.copyBtn.textContent = "Copied";
      setTimeout(function () {
        el.copyBtn.textContent = "Copy";
      }, 1500);
    });
  }

  [el.refDpi, el.refSens, el.yourDpi].forEach(function (input) {
    input.addEventListener("input", update);
  });
  el.copyBtn.addEventListener("click", copyValue);

  buildAdsRows();
  update();

  // ── Live map rotation ─────────────────────────────────────────────
  var metaEl = {
    panel: document.getElementById("metaPanel"),
    status: document.getElementById("metaStatus"),
    grid: document.getElementById("metaGrid"),
  };

  function fmtRemaining(secs) {
    if (secs == null || secs < 0) return "";
    var h = Math.floor(secs / 3600);
    var m = Math.floor((secs % 3600) / 60);
    if (h > 0) return h + "h " + m + "m";
    return m + "m";
  }

  function modeCard(label, block) {
    if (!block || !block.current) return "";
    var cur = block.current;
    var next = block.next || {};
    // remainingSecs isn't present on every mode (e.g. ranked), so guard it.
    var remaining =
      typeof cur.remainingSecs === "number"
        ? fmtRemaining(cur.remainingSecs)
        : cur.remainingTimer || "";
    if (!cur.map) return "";
    return (
      '<div class="meta-card">' +
      '<span class="meta-mode">' + label + "</span>" +
      '<span class="meta-map">' + cur.map + "</span>" +
      (remaining
        ? '<span class="meta-remaining">' + remaining + " left</span>"
        : "") +
      (next.map
        ? '<span class="meta-next">Next: ' + next.map + "</span>"
        : "") +
      "</div>"
    );
  }

  function renderRotation(data) {
    if (!data || data.error) {
      metaEl.status.textContent =
        "Couldn't load live rotation. Retrying shortly.";
      metaEl.status.hidden = false;
      metaEl.grid.hidden = true;
      return;
    }
    var cards = "";
    cards += modeCard("Battle Royale", data.battle_royale);
    cards += modeCard("Ranked", data.ranked);
    // The limited-time / mixtape mode has appeared under a few keys over time;
    // check the known ones so we stay compatible.
    cards += modeCard("Mixtape", data.ltm || data.mixtape || data.control);
    if (!cards) {
      metaEl.status.textContent = "No rotation data available right now.";
      metaEl.status.hidden = false;
      metaEl.grid.hidden = true;
      return;
    }
    metaEl.grid.innerHTML = cards;
    metaEl.grid.hidden = false;
    metaEl.status.hidden = true;
  }

  function loadRotation() {
    if (!META_WORKER_URL) {
      metaEl.status.textContent =
        "Live rotation isn't connected yet. (Set your Worker URL in app.js.)";
      metaEl.status.hidden = false;
      return;
    }
    fetch(META_WORKER_URL + "/maprotation")
      .then(function (r) {
        if (!r.ok) throw new Error("bad status " + r.status);
        return r.json();
      })
      .then(function (data) {
        renderRotation(data);
      })
      .catch(function () {
        metaEl.status.textContent =
          "Couldn't load live rotation. Retrying shortly.";
        metaEl.status.hidden = false;
      });
  }

  if (metaEl.panel) {
    loadRotation();
    setInterval(loadRotation, META_REFRESH_MS);
  }
})();
