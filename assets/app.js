// Site RLC-HESS — charge data/teams.json et data/bracket.json, gère les onglets.

const DISCORD_INVITE = "https://discord.gg/kKjYH63Hv7";

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ── Équipes ───────────────────────────────────────────────────────────────────

function teamRow(t, seed) {
  const logo = t.logo
    ? `<img class="team-logo" src="${esc(t.logo)}" alt="" loading="lazy" onerror="this.classList.add('ph');this.removeAttribute('src');this.textContent='🛡️'">`
    : `<div class="team-logo ph">🛡️</div>`;
  const members = (t.players || []).map((p) => esc(p.pseudo)).join(" · ");
  const ranks = (t.players || []).map((p) => esc(p.rank)).filter(Boolean).join(" / ");
  return `
    <div class="team">
      <div class="seed">${seed}</div>
      ${logo}
      <div class="team-main">
        <div class="team-name"><span class="tag">${esc(t.tag)}</span> ${esc(t.name)}</div>
        <div class="team-sub">${members}${ranks ? " — " + ranks : ""}</div>
      </div>
      ${t.status === "waitlist" ? '<span class="team-badge">Attente</span>' : ""}
    </div>`;
}

async function load() {
  const counter = document.getElementById("counter");
  const grid = document.getElementById("teams");
  const empty = document.getElementById("empty");
  const updated = document.getElementById("updated");
  try {
    const res = await fetch(`data/teams.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    const teams = data.teams || [];

    counter.textContent = `${teams.length} engagée${teams.length > 1 ? "s" : ""}`;

    if (!teams.length) {
      empty.hidden = false;
    } else {
      grid.innerHTML = teams.map((t, i) => teamRow(t, i + 1)).join("");
    }
    if (data.updatedAt) {
      updated.textContent = "Mis à jour le " + new Date(data.updatedAt).toLocaleString("fr-FR");
    }
  } catch (e) {
    counter.textContent = "";
    empty.hidden = false;
    empty.textContent = "Les données ne sont pas encore disponibles.";
  }
}

// ── Bracket ───────────────────────────────────────────────────────────────────

function dots(score, bestOf) {
  const need = Math.ceil(bestOf / 2);
  return Array.from({ length: need }, (_, i) =>
    `<span class="dot ${i < score ? "dot-on" : ""}">${i < score ? "●" : "○"}</span>`
  ).join("");
}

// data-mid stocke l'id du match sur chaque carte pour que drawConnectors
// puisse retrouver les éléments sans closure.
function matchCard(m) {
  const t1 = m.team1, t2 = m.team2;
  const isLive = m.status === "in_progress" && m.isLive;
  const isDone = m.status === "completed";
  const pending = !t1 || !t2;

  const row = (t, score, bo, isWinner) => {
    if (!t) return `<div class="bm-team bm-tbd"><span class="bm-tag">?</span><span class="bm-name">À déterminer</span></div>`;
    return `<div class="bm-team ${isWinner ? "bm-winner" : ""}">
      ${t.logo ? `<img class="bm-logo" src="${esc(t.logo)}" alt="" onerror="this.style.display='none'">` : ""}
      <span class="bm-seed">${t.seed ?? ""}</span>
      <span class="bm-tag">${esc(t.tag)}</span>
      <span class="bm-name">${esc(t.name)}</span>
      <span class="bm-dots">${dots(score, bo)}</span>
      <span class="bm-score">${score}</span>
    </div>`;
  };

  const w1 = isDone && m.winner && m.team1 && m.winner.id === m.team1.id;
  const w2 = isDone && m.winner && m.team2 && m.winner.id === m.team2.id;

  const gameScoreLine = m.status === "in_progress" && (m.gameScore1 > 0 || m.gameScore2 > 0)
    ? `<div class="bm-game-score">🔵 <b>${m.gameScore1}</b> — <b>${m.gameScore2}</b> 🔴 <span class="bm-game-label">partie en cours</span></div>`
    : "";

  return `<div class="bm-card ${isDone ? "bm-done" : ""} ${isLive ? "bm-live" : ""} ${pending ? "bm-pending" : ""}" data-mid="${m.id}">
    <div class="bm-header">
      <span class="bm-num">M${m.id}</span>
      ${m.estimatedTime ? `<span class="bm-time">⏰ ${esc(m.estimatedTime)}</span>` : ""}
      ${isLive ? '<span class="bm-badge-live">🎙️ DIRECT</span>' : ""}
      ${isDone ? '<span class="bm-badge-done">✅</span>' : ""}
      ${m.status === "in_progress" && !isLive ? '<span class="bm-badge-prog">⚡</span>' : ""}
    </div>
    <div class="bm-teams">
      ${row(t1, m.score1, m.bestOf, w1)}
      ${gameScoreLine}
      ${row(t2, m.score2, m.bestOf, w2)}
    </div>
    <div class="bm-footer">
      <span class="bm-fmt">${m.bestOf === 5 ? "BO5" : "BO3"}</span>
    </div>
  </div>`;
}

// ── Dessin SVG des connecteurs (pas de closure — lit le DOM en direct) ────────

// rounds stocké ici pour que drawBracketConnectors puisse y accéder depuis initTabs.
let _bracketRounds = null;

function drawBracketConnectors() {
  if (!_bracketRounds) return;

  const colsWrap = document.querySelector(".bt-cols")?.parentElement;
  if (!colsWrap) return;

  const base = colsWrap.getBoundingClientRect();
  if (base.width === 0) return; // panel encore caché

  let svg = colsWrap.querySelector("svg");
  if (!svg) return;

  svg.setAttribute("width", base.width);
  svg.setAttribute("height", base.height);
  svg.setAttribute("viewBox", `0 0 ${base.width} ${base.height}`);
  svg.innerHTML = "";

  const svgNS = "http://www.w3.org/2000/svg";
  const lineColor = getComputedStyle(document.documentElement)
    .getPropertyValue("--line").trim() || "#1e3546";

  // Retrouve chaque carte par son data-mid
  const cardEl = (id) => colsWrap.querySelector(`.bm-card[data-mid="${id}"]`);

  for (let ri = 1; ri < _bracketRounds.length; ri++) {
    for (const m of _bracketRounds[ri].matches) {
      const srcIds = m.sourceMatchIds || [];
      const dstEl = cardEl(m.id);
      if (!dstEl) continue;

      const dstR = dstEl.getBoundingClientRect();
      const dstX = dstR.left - base.left;
      const dstMidY = dstR.top - base.top + dstR.height / 2;

      for (const srcId of srcIds) {
        if (!srcId) continue;
        const srcEl = cardEl(srcId);
        if (!srcEl) continue;

        const srcR = srcEl.getBoundingClientRect();
        const srcX = srcR.right - base.left;
        const srcMidY = srcR.top - base.top + srcR.height / 2;
        const midX = (srcX + dstX) / 2;

        const path = document.createElementNS(svgNS, "path");
        path.setAttribute("d",
          `M${srcX.toFixed(1)},${srcMidY.toFixed(1)} ` +
          `H${midX.toFixed(1)} V${dstMidY.toFixed(1)} H${dstX.toFixed(1)}`
        );
        path.setAttribute("stroke", lineColor);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("fill", "none");
        svg.appendChild(path);
      }
    }
  }
}

// ── Bracket tree (style Challonge) ────────────────────────────────────────────

async function loadBracket() {
  const grid = document.getElementById("bracket-grid");
  const empty = document.getElementById("bracket-empty");
  try {
    const res = await fetch(`data/bracket.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    if (!data.rounds?.length) { empty.hidden = false; return; }

    _bracketRounds = data.rounds;
    empty.hidden = true;
    grid.innerHTML = "";
    renderBracketTree(data, grid);

    if (data.updatedAt) {
      const upd = document.getElementById("bracket-updated");
      if (upd) upd.textContent = "Mis à jour le " + new Date(data.updatedAt).toLocaleString("fr-FR");
    }
  } catch (_) {
    empty.hidden = false;
  }
}

function renderBracketTree(data, container) {
  const rounds = data.rounds;
  if (!rounds.length) return;

  const CARD_W = 210;
  const H_GAP = 90;
  const SLOT_H = 148;

  const svgNS = "http://www.w3.org/2000/svg";
  const r1Count = rounds[0].matches.length;
  const colH = r1Count * SLOT_H;

  const scroller = document.createElement("div");
  scroller.className = "bt-scroller";

  const outer = document.createElement("div");
  outer.className = "bt-outer";

  // ── Labels ────────────────────────────────────────────────────────────────
  const labelsRow = document.createElement("div");
  labelsRow.className = "bt-labels";
  labelsRow.style.gap = `${H_GAP}px`;

  for (const r of rounds) {
    const lbl = document.createElement("div");
    lbl.className = "bt-round-label";
    lbl.style.width = `${CARD_W}px`;
    lbl.textContent = r.name;
    labelsRow.appendChild(lbl);
  }

  // ── Colonnes + overlay SVG ────────────────────────────────────────────────
  const colsWrap = document.createElement("div");
  colsWrap.style.cssText = "position:relative;";

  const colsRow = document.createElement("div");
  colsRow.className = "bt-cols";
  colsRow.style.gap = `${H_GAP}px`;

  for (const r of rounds) {
    const col = document.createElement("div");
    col.style.cssText = [
      "display:flex", "flex-direction:column", "justify-content:space-around",
      `width:${CARD_W}px`, `height:${colH}px`, "flex-shrink:0",
    ].join(";");

    for (const m of r.matches) {
      const tmp = document.createElement("div");
      tmp.innerHTML = matchCard(m);
      const card = tmp.firstElementChild;
      if (card) col.appendChild(card);
    }

    colsRow.appendChild(col);
  }

  const svg = document.createElementNS(svgNS, "svg");
  svg.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:visible;";

  colsWrap.appendChild(colsRow);
  colsWrap.appendChild(svg);
  outer.appendChild(labelsRow);
  outer.appendChild(colsWrap);
  scroller.appendChild(outer);
  container.appendChild(scroller);

  // Dessiner les connecteurs si le panel est déjà visible,
  // sinon initTabs le fera au clic sur l'onglet bracket.
  requestAnimationFrame(drawBracketConnectors);
}

// ── Onglets ───────────────────────────────────────────────────────────────────

function initTabs() {
  const tabs = document.querySelectorAll(".tab");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      tabs.forEach((t) => t.classList.toggle("active", t === tab));
      document.querySelectorAll(".tab-panel").forEach((p) =>
        p.classList.toggle("active", p.id === name)
      );
      if (name === "bracket") {
        requestAnimationFrame(drawBracketConnectors);
      }
    });
  });
}

function initDiscordLinks() {
  document.querySelectorAll("[data-discord]").forEach((a) => (a.href = DISCORD_INVITE));
}

initTabs();
initDiscordLinks();
load();
loadBracket();
