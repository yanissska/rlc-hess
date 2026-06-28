// Éditeur de logo à calques (texte + formes) — client-side, responsive.
(function () {
  "use strict";
  const S = 512;
  const TAU = Math.PI * 2;

  const FONTS = [
    ["Russo One", 400], ["Bebas Neue", 400], ["Anton", 400], ["Archivo Black", 400],
    ["Oswald", 700], ["Teko", 700], ["Rajdhani", 700], ["Saira Condensed", 800],
    ["Orbitron", 800], ["Audiowide", 400], ["Black Ops One", 400], ["Bungee", 400],
    ["Chakra Petch", 700], ["Goldman", 700], ["Righteous", 400], ["Squada One", 400],
    ["Staatliches", 400], ["Montserrat", 900],
  ];

  // Formes de badge (fond) — classiques esport, avec libellés FR
  const BADGE_SHAPES = [
    ["shield", "Bouclier"], ["shield-round", "Écusson"], ["circle", "Cercle"],
    ["hex", "Hexagone"], ["octagon", "Octogone"], ["diamond", "Losange"],
    ["pennant", "Bannière"], ["roundsquare", "Carré"], ["none", "Aucun"],
  ];

  // Icônes vectorielles superposables (centrées dans une boîte size×size)
  const VECTORS = {
    star: (c, r) => poly(c, 5, r, -90, r * 0.46),
    spark: (c, r) => poly(c, 4, r, -90, r * 0.3),
    burst: (c, r) => poly(c, 8, r, -90, r * 0.5),
    triangle: (c, r) => poly(c, 3, r, -90),
    diamond: (c, r) => poly(c, 4, r, -90),
    pentagon: (c, r) => poly(c, 5, r, -90),
    hexagon: (c, r) => poly(c, 6, r, -90),
    octagon: (c, r) => poly(c, 8, r, -22.5),
    circle: (c, r) => c.arc(0, 0, r, 0, TAU),
    ring: (c, r) => { c.arc(0, 0, r, 0, TAU); c.arc(0, 0, r * 0.6, 0, TAU, true); },
    bolt: (c, r) => path(c, r, [[0.05, -1], [-0.55, 0.12], [-0.08, 0.12], [-0.2, 1], [0.55, -0.18], [0.08, -0.18]]),
    flame: (c, r) => { c.moveTo(0, r); c.bezierCurveTo(r * 0.95, r * 0.5, r * 0.55, -r * 0.25, r * 0.18, -r); c.bezierCurveTo(r * 0.25, -r * 0.25, -r * 0.1, -r * 0.2, -r * 0.05, -r * 0.7); c.bezierCurveTo(-r * 0.85, -r * 0.15, -r * 0.8, r * 0.55, 0, r); },
    shield: (c, r) => { c.moveTo(0, -r); c.lineTo(r * 0.86, -r * 0.62); c.lineTo(r * 0.86, r * 0.1); c.quadraticCurveTo(r * 0.86, r * 0.72, 0, r); c.quadraticCurveTo(-r * 0.86, r * 0.72, -r * 0.86, r * 0.1); c.lineTo(-r * 0.86, -r * 0.62); c.closePath(); },
    crown: (c, r) => path(c, r, [[-1, 0.55], [-1, -0.4], [-0.5, 0.05], [0, -0.6], [0.5, 0.05], [1, -0.4], [1, 0.55]]),
    chevron: (c, r) => path(c, r, [[-0.9, -0.55], [0, 0.15], [0.9, -0.55], [0.9, 0.05], [0, 0.75], [-0.9, 0.05]]),
    cross: (c, r) => path(c, r, [[-0.32, -1], [0.32, -1], [0.32, -0.32], [1, -0.32], [1, 0.32], [0.32, 0.32], [0.32, 1], [-0.32, 1], [-0.32, 0.32], [-1, 0.32], [-1, -0.32], [-0.32, -0.32]]),
    wing: (c, r) => path(c, r, [[-1, -0.3], [-0.2, -0.15], [0, 0.1], [-0.35, 0.05], [-0.55, 0.35], [-0.6, 0.05], [-1, 0.1]]),
    target: (c, r) => { c.arc(0, 0, r, 0, TAU); c.arc(0, 0, r * 0.66, 0, TAU, true); c.arc(0, 0, r * 0.33, 0, TAU); },
  };
  function poly(c, n, r, startDeg, innerR) {
    const a0 = (startDeg * Math.PI) / 180, count = innerR ? n * 2 : n;
    for (let i = 0; i < count; i++) {
      const rr = innerR && i % 2 ? innerR : r;
      const ang = a0 + (TAU * i) / count;
      const x = rr * Math.cos(ang), y = rr * Math.sin(ang);
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
  }
  function path(c, r, pts) { pts.forEach(([x, y], i) => (i ? c.lineTo(x * r, y * r) : c.moveTo(x * r, y * r))); c.closePath(); }

  // ─── État ────────────────────────────────────────────────────────────────────
  const DEFAULT_BADGE = { shape: "shield", bgMode: "gradient", color1: "#0e2a3e", color2: "#081521", border: 16, borderColor: "#cdd9e0" };
  let badge = { ...DEFAULT_BADGE };
  let layers = [];
  let sel = null;
  let uid = 1;

  const cv = document.getElementById("logo");
  let drag = null;

  // ─── Calques ─────────────────────────────────────────────────────────────────
  function baseLayer(t) { return { id: uid++, type: t, x: S / 2, y: S / 2, scale: 1, rotation: 0 }; }
  function addText() {
    layers.push(Object.assign(baseLayer("text"), { text: "TEXTE", font: "Russo One", size: 96, gradient: true, color1: "#74eef5", color2: "#199fb4", stroke: true, strokeColor: "#04222b", strokeWidth: 9 }));
    select(last().id); paint(); renderLayers();
  }
  function addShape(name) {
    layers.push(Object.assign(baseLayer("shape"), { shape: name, size: 150, gradient: false, color1: "#29c2dd", color2: "#1390a8", stroke: false, strokeColor: "#04222b", strokeWidth: 0 }));
    select(last().id); paint(); renderLayers();
  }
  function last() { return layers[layers.length - 1]; }

  // ─── Formes de badge (fond) ──────────────────────────────────────────────────
  function badgePath(c, shape, cx, cy, r) {
    c.beginPath();
    if (shape === "shield") {
      c.moveTo(cx, cy - r); c.lineTo(cx + r * 0.95, cy - r * 0.6); c.lineTo(cx + r * 0.95, cy + r * 0.08);
      c.quadraticCurveTo(cx + r * 0.95, cy + r * 0.78, cx, cy + r);
      c.quadraticCurveTo(cx - r * 0.95, cy + r * 0.78, cx - r * 0.95, cy + r * 0.08);
      c.lineTo(cx - r * 0.95, cy - r * 0.6); c.closePath();
    } else if (shape === "shield-round") {
      c.moveTo(cx, cy - r); c.quadraticCurveTo(cx + r * 0.95, cy - r, cx + r * 0.95, cy - r * 0.45);
      c.lineTo(cx + r * 0.95, cy + r * 0.08); c.quadraticCurveTo(cx + r * 0.95, cy + r * 0.78, cx, cy + r);
      c.quadraticCurveTo(cx - r * 0.95, cy + r * 0.78, cx - r * 0.95, cy + r * 0.08);
      c.lineTo(cx - r * 0.95, cy - r * 0.45); c.quadraticCurveTo(cx - r * 0.95, cy - r, cx, cy - r); c.closePath();
    } else if (shape === "circle") c.arc(cx, cy, r, 0, TAU);
    else if (shape === "hex") badgePoly(c, 6, r, -90, cx, cy);
    else if (shape === "octagon") badgePoly(c, 8, r, -22.5, cx, cy);
    else if (shape === "diamond") badgePoly(c, 4, r, -90, cx, cy);
    else if (shape === "roundsquare") roundRect(c, cx - r * 0.92, cy - r * 0.92, r * 1.84, r * 1.84, r * 0.26);
    else if (shape === "pennant") {
      c.moveTo(cx - r * 0.9, cy - r); c.lineTo(cx + r * 0.9, cy - r);
      c.lineTo(cx + r * 0.9, cy + r * 0.45); c.lineTo(cx, cy + r); c.lineTo(cx - r * 0.9, cy + r * 0.45); c.closePath();
    }
  }
  function badgePoly(c, n, r, startDeg, cx, cy) {
    const a0 = (startDeg * Math.PI) / 180;
    for (let i = 0; i < n; i++) { const a = a0 + (TAU * i) / n, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.closePath();
  }
  function roundRect(c, x, y, w, h, r) { c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function drawBadge(c) {
    if (badge.shape === "none") return;
    badgePath(c, badge.shape, S / 2, S / 2, S * 0.42);
    if (badge.bgMode !== "transparent") {
      if (badge.bgMode === "gradient") { const g = c.createLinearGradient(0, S * 0.08, 0, S * 0.95); g.addColorStop(0, badge.color1); g.addColorStop(1, badge.color2); c.fillStyle = g; }
      else c.fillStyle = badge.color1;
      c.fill();
    }
    if (badge.border > 0) { c.lineWidth = badge.border; c.strokeStyle = badge.borderColor; c.lineJoin = "round"; c.stroke(); }
  }

  // ─── Dessin des calques ──────────────────────────────────────────────────────
  function drawLayer(c, l) {
    c.save();
    c.translate(l.x, l.y); c.rotate((l.rotation * Math.PI) / 180); c.scale(l.scale, l.scale);
    let hw = 0, hh = 0;
    if (l.type === "text") {
      const w = FONTS.find((f) => f[0] === l.font)?.[1] || 700;
      c.font = `${w} ${l.size}px "${l.font}", sans-serif`; c.textAlign = "center"; c.textBaseline = "middle";
      hw = Math.max(10, c.measureText(l.text || " ").width / 2 * 1.04); hh = l.size * 0.62;
      const fill = l.gradient ? grad(c, l.color1, l.color2, l.size) : l.color1;
      if (l.stroke && l.strokeWidth > 0) { c.lineWidth = l.strokeWidth; c.strokeStyle = l.strokeColor; c.lineJoin = "round"; c.miterLimit = 2; c.strokeText(l.text, 0, 0); }
      c.fillStyle = fill; c.fillText(l.text, 0, 0);
    } else if (l.type === "shape") {
      const r = l.size / 2; hw = hh = r;
      c.beginPath(); (VECTORS[l.shape] || VECTORS.star)(c, r);
      c.fillStyle = l.gradient ? grad(c, l.color1, l.color2, l.size) : l.color1; c.fill("evenodd");
      if (l.stroke && l.strokeWidth > 0) { c.lineWidth = l.strokeWidth; c.strokeStyle = l.strokeColor; c.lineJoin = "round"; c.stroke(); }
    }
    c.restore();
    l._lw = hw; l._lh = hh;
  }
  function grad(c, a, b, size) { const g = c.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, a); g.addColorStop(1, b); return g; }

  function render(c, showSel) {
    c.clearRect(0, 0, S, S);
    drawBadge(c);
    for (const l of layers) drawLayer(c, l);
    if (showSel && sel != null) drawSelection(c, getLayer(sel));
  }

  // ─── Sélection & poignées ────────────────────────────────────────────────────
  function worldPoint(l, lx, ly) { const r = (l.rotation * Math.PI) / 180, cs = Math.cos(r), sn = Math.sin(r), s = l.scale; return { x: l.x + s * (lx * cs - ly * sn), y: l.y + s * (lx * sn + ly * cs) }; }
  function handles(l) { return { resize: worldPoint(l, l._lw, l._lh), rotate: worldPoint(l, 0, -l._lh - 30 / l.scale), corners: [worldPoint(l, -l._lw, -l._lh), worldPoint(l, l._lw, -l._lh), worldPoint(l, l._lw, l._lh), worldPoint(l, -l._lw, l._lh)] }; }
  function drawSelection(c, l) {
    if (!l) return;
    const h = handles(l);
    c.save(); c.strokeStyle = "#29c2dd"; c.lineWidth = 2; c.setLineDash([6, 4]);
    c.beginPath(); h.corners.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath(); c.stroke();
    c.setLineDash([]);
    const top = worldPoint(l, 0, -l._lh); c.beginPath(); c.moveTo(top.x, top.y); c.lineTo(h.rotate.x, h.rotate.y); c.stroke();
    dot(c, h.rotate, true); dot(c, h.resize, false); c.restore();
  }
  function dot(c, p, round) {
    c.fillStyle = "#29c2dd"; c.strokeStyle = "#04222b"; c.lineWidth = 2;
    if (round) { c.beginPath(); c.arc(p.x, p.y, 9, 0, TAU); c.fill(); c.stroke(); }
    else { c.fillRect(p.x - 8, p.y - 8, 16, 16); c.strokeRect(p.x - 8, p.y - 8, 16, 16); }
  }
  function getLayer(id) { return layers.find((l) => l.id === id); }
  function hitLayer(px, py) {
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i], dx = px - l.x, dy = py - l.y, r = (l.rotation * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
      const lx = (dx * c + dy * s) / l.scale, ly = (-dx * s + dy * c) / l.scale;
      if (Math.abs(lx) <= l._lw && Math.abs(ly) <= l._lh) return l;
    }
    return null;
  }

  // ─── Pointeur ────────────────────────────────────────────────────────────────
  function toLogical(e) { const rect = cv.getBoundingClientRect(); return { x: (e.clientX - rect.left) / rect.width * S, y: (e.clientY - rect.top) / rect.height * S, tol: 18 * S / rect.width }; }
  cv.addEventListener("pointerdown", (e) => {
    const p = toLogical(e); cv.setPointerCapture(e.pointerId);
    if (sel != null) {
      const l = getLayer(sel), h = handles(l);
      if (near(p, h.rotate, p.tol)) { drag = { mode: "rotate", l }; return; }
      if (near(p, h.resize, p.tol)) { drag = { mode: "resize", l, startDist: dist(p, l), startScale: l.scale }; return; }
    }
    const hit = hitLayer(p.x, p.y);
    if (hit) { select(hit.id); drag = { mode: "move", l: hit, offx: p.x - hit.x, offy: p.y - hit.y }; }
    else select(null);
    paint(); renderLayers();
  });
  cv.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const p = toLogical(e), l = drag.l;
    if (drag.mode === "move") { l.x = p.x - drag.offx; l.y = p.y - drag.offy; }
    else if (drag.mode === "resize") { l.scale = Math.max(0.12, drag.startScale * dist(p, l) / Math.max(1, drag.startDist)); syncProps(); }
    else if (drag.mode === "rotate") { l.rotation = Math.atan2(p.y - l.y, p.x - l.x) * 180 / Math.PI + 90; syncProps(); }
    paint();
  });
  cv.addEventListener("pointerup", () => (drag = null));
  function near(a, b, t) { return Math.hypot(a.x - b.x, a.y - b.y) <= t; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function paint() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = S * dpr; cv.height = S * dpr;
    const c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); render(c, true);
  }

  // ─── Propriétés ──────────────────────────────────────────────────────────────
  const propsEl = document.getElementById("props");
  const propsTitle = document.getElementById("props-title");
  function select(id) { sel = id; buildProps(); }

  const fColor = (p, label, t) => `<div class="field"><label>${label}</label><input type="color" data-t="${t}" data-p="${p}"></div>`;
  const fRange = (p, label, min, max, t) => `<div class="field"><label>${label}</label><input type="range" min="${min}" max="${max}" data-t="${t}" data-p="${p}" data-num></div>`;
  const fCheck = (p, label, t) => `<div class="field check"><input type="checkbox" id="c_${p}" data-t="${t}" data-p="${p}" data-bool><label for="c_${p}">${label}</label></div>`;
  const fText = (p, label, t) => `<div class="field"><label>${label}</label><input type="text" maxlength="14" data-t="${t}" data-p="${p}"></div>`;
  const fSelect = (p, label, opts, t) => `<div class="field"><label>${label}</label><select data-t="${t}" data-p="${p}">${opts.map((v) => { const val = Array.isArray(v) ? v[0] : v, lab = Array.isArray(v) ? v[1] : v; return `<option value="${val}">${lab}</option>`; }).join("")}</select></div>`;

  function buildProps() {
    let html = "";
    if (sel == null) {
      propsTitle.textContent = "Fond du badge";
      html += `<div class="field"><label>Forme</label><div class="picker" id="badge-picker"></div></div>`;
      html += fSelect("bgMode", "Remplissage", [["gradient", "Dégradé"], ["solid", "Uni"], ["transparent", "Transparent"]], "badge");
      html += `<div class="cols2">${fColor("color1", "Couleur 1", "badge")}${fColor("color2", "Couleur 2", "badge")}</div>`;
      html += `<div class="cols2">${fRange("border", "Contour", 0, 40, "badge")}${fColor("borderColor", "Couleur", "badge")}</div>`;
    } else {
      const l = getLayer(sel);
      if (!l) { sel = null; return buildProps(); }
      if (l.type === "text") {
        propsTitle.textContent = "Texte";
        html += fText("text", "Contenu", "layer");
        html += fSelect("font", "Police", FONTS.map((f) => f[0]), "layer");
        html += fRange("size", "Taille", 20, 220, "layer");
        html += fCheck("gradient", "Couleur en dégradé", "layer");
        html += `<div class="cols2">${fColor("color1", "Couleur 1", "layer")}${fColor("color2", "Couleur 2", "layer")}</div>`;
        html += fCheck("stroke", "Contour", "layer");
        html += `<div class="cols2">${fColor("strokeColor", "Couleur", "layer")}${fRange("strokeWidth", "Épaisseur", 0, 24, "layer")}</div>`;
      } else {
        propsTitle.textContent = "Forme";
        html += fSelect("shape", "Icône", Object.keys(VECTORS), "layer");
        html += fRange("size", "Taille", 30, 360, "layer");
        html += fCheck("gradient", "Couleur en dégradé", "layer");
        html += `<div class="cols2">${fColor("color1", "Couleur 1", "layer")}${fColor("color2", "Couleur 2", "layer")}</div>`;
        html += fCheck("stroke", "Contour", "layer");
        html += `<div class="cols2">${fColor("strokeColor", "Couleur", "layer")}${fRange("strokeWidth", "Épaisseur", 0, 24, "layer")}</div>`;
      }
      html += fRange("rotation", "Rotation", -180, 180, "layer");
      html += `<button class="danger" id="del-layer">🗑 Supprimer ce calque</button>`;
    }
    propsEl.innerHTML = html;
    if (sel == null) buildBadgePicker();
    wireProps(); syncProps();
  }

  function buildBadgePicker() {
    const wrap = document.getElementById("badge-picker"); if (!wrap) return;
    BADGE_SHAPES.forEach(([val, label]) => {
      const b = document.createElement("button"); b.title = label; b.dataset.val = val;
      if (badge.shape === val) b.classList.add("active");
      const cc = document.createElement("canvas"); cc.width = cc.height = 30; const x = cc.getContext("2d");
      if (val === "none") { x.strokeStyle = "#7a8c98"; x.setLineDash([3, 3]); x.lineWidth = 1.5; x.strokeRect(5, 5, 20, 20); }
      else { badgePath(x, val, 15, 15, 12.5); x.fillStyle = "#2c5269"; x.fill(); x.lineWidth = 1.6; x.strokeStyle = "#cfe8ef"; x.stroke(); }
      b.appendChild(cc);
      b.addEventListener("click", () => { badge.shape = val; paint(); buildProps(); });
      wrap.appendChild(b);
    });
  }

  function wireProps() {
    propsEl.querySelectorAll("[data-p]").forEach((el) => {
      const tgt = () => (el.dataset.t === "badge" ? badge : getLayer(sel));
      const ev = el.type === "range" || el.type === "color" ? "input" : "change";
      el.addEventListener(ev, () => {
        const o = tgt(); if (!o) return;
        if (el.dataset.bool != null) o[el.dataset.p] = el.checked;
        else if (el.dataset.num != null) o[el.dataset.p] = Number(el.value);
        else o[el.dataset.p] = el.value;
        if (el.dataset.p === "font") loadFont(el.value).then(paint); else paint();
        if (["text", "shape", "font"].includes(el.dataset.p)) renderLayers();
      });
    });
    const del = document.getElementById("del-layer");
    if (del) del.addEventListener("click", () => removeLayer(sel));
  }
  function syncProps() {
    propsEl.querySelectorAll("[data-p]").forEach((el) => {
      const o = el.dataset.t === "badge" ? badge : getLayer(sel);
      if (!o) return;
      if (el.dataset.bool != null) el.checked = !!o[el.dataset.p];
      else if (o[el.dataset.p] != null) el.value = o[el.dataset.p];
    });
  }

  // ─── Panneau Calques ─────────────────────────────────────────────────────────
  const layersEl = document.getElementById("layers");
  function layerLabel(l) { return l.type === "text" ? `Texte « ${l.text} »` : `Forme · ${l.shape}`; }
  function renderLayers() {
    layersEl.innerHTML = "";
    // Ligne "Fond / Badge" (toujours en bas de la pile)
    const fond = document.createElement("li");
    fond.className = "layer-row" + (sel == null ? " active" : "");
    fond.innerHTML = `<span class="lico">🎨</span><span class="lbl">Fond / Badge</span>`;
    fond.addEventListener("click", () => { select(null); paint(); renderLayers(); });
    layersEl.appendChild(fond);

    if (!layers.length) {
      const li = document.createElement("li"); li.className = "layers-empty"; li.textContent = "Ajoute un texte ou une forme.";
      layersEl.appendChild(li); return;
    }
    [...layers].reverse().forEach((l) => {
      const li = document.createElement("li");
      li.className = "layer-row" + (l.id === sel ? " active" : "");
      li.innerHTML = `<span class="lico">${l.type === "text" ? "🅣" : "◆"}</span><span class="lbl">${escapeHtml(layerLabel(l))}</span>
        <span class="lbtns"><button data-a="up" title="Monter">▲</button><button data-a="down" title="Descendre">▼</button>
        <button data-a="dup" title="Dupliquer">⧉</button><button data-a="del" title="Supprimer">🗑</button></span>`;
      li.addEventListener("click", (e) => { if (e.target.dataset.a) return; select(l.id); paint(); renderLayers(); });
      li.querySelectorAll("[data-a]").forEach((b) => b.addEventListener("click", (e) => { e.stopPropagation(); layerAction(b.dataset.a, l.id); }));
      layersEl.appendChild(li);
    });
  }
  function layerAction(a, id) {
    const i = layers.findIndex((l) => l.id === id); if (i < 0) return;
    if (a === "up" && i < layers.length - 1) [layers[i], layers[i + 1]] = [layers[i + 1], layers[i]];
    if (a === "down" && i > 0) [layers[i], layers[i - 1]] = [layers[i - 1], layers[i]];
    if (a === "dup") { const c = { ...layers[i], id: uid++, x: layers[i].x + 24, y: layers[i].y + 24 }; layers.splice(i + 1, 0, c); select(c.id); }
    if (a === "del") return removeLayer(id);
    paint(); renderLayers();
  }
  function removeLayer(id) { layers = layers.filter((l) => l.id !== id); if (sel === id) select(null); paint(); renderLayers(); }
  function escapeHtml(s) { return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c])); }

  // ─── Picker de formes à ajouter ──────────────────────────────────────────────
  const shapesPicker = document.getElementById("shapes-picker");
  Object.keys(VECTORS).forEach((name) => {
    const b = document.createElement("button"); b.title = name;
    const cc = document.createElement("canvas"); cc.width = cc.height = 30; const x = cc.getContext("2d");
    x.translate(15, 15); x.beginPath(); VECTORS[name](x, 11); x.fillStyle = "#cfe8ef"; x.fill("evenodd");
    b.appendChild(cc); b.addEventListener("click", () => addShape(name)); shapesPicker.appendChild(b);
  });
  document.getElementById("add-text").addEventListener("click", addText);

  // ─── Modèles ─────────────────────────────────────────────────────────────────
  const L = (type, props) => Object.assign(baseLayer(type), props);
  const PRESETS = {
    "RLC-HESS": () => {
      badge = { shape: "shield", bgMode: "gradient", color1: "#0e2a3e", color2: "#081521", border: 16, borderColor: "#cdd9e0" };
      layers = [
        L("text", { text: "RLC", font: "Russo One", size: 116, x: S / 2, y: S * 0.34, gradient: true, color1: "#74eef5", color2: "#199fb4", stroke: true, strokeColor: "#04222b", strokeWidth: 10 }),
        L("text", { text: "HESS", font: "Russo One", size: 86, x: S / 2, y: S * 0.62, gradient: true, color1: "#74eef5", color2: "#199fb4", stroke: true, strokeColor: "#04222b", strokeWidth: 9 }),
        L("shape", { shape: "spark", size: 70, x: S / 2, y: S * 0.83, gradient: true, color1: "#9af2fb", color2: "#29c2dd" }),
      ];
    },
    "Inferno": () => {
      badge = { shape: "hex", bgMode: "gradient", color1: "#3a0d0d", color2: "#120505", border: 14, borderColor: "#ff9f1c" };
      layers = [L("shape", { shape: "flame", size: 200, x: S / 2, y: S * 0.45, gradient: true, color1: "#ffd166", color2: "#ef4444" }),
      L("text", { text: "BLAZE", font: "Bebas Neue", size: 104, x: S / 2, y: S * 0.81, gradient: false, color1: "#ffd166", stroke: true, strokeColor: "#1a0606", strokeWidth: 8 })];
    },
    "Néon": () => {
      badge = { shape: "octagon", bgMode: "solid", color1: "#0a0a18", color2: "#0a0a18", border: 12, borderColor: "#a855f7" };
      layers = [L("shape", { shape: "bolt", size: 190, x: S / 2, y: S * 0.42, gradient: true, color1: "#67e8f9", color2: "#a855f7" }),
      L("text", { text: "VOLT", font: "Audiowide", size: 80, x: S / 2, y: S * 0.8, gradient: true, color1: "#67e8f9", color2: "#a855f7", stroke: true, strokeColor: "#05010f", strokeWidth: 6 })];
    },
    "Étoiles": () => {
      badge = { shape: "circle", bgMode: "gradient", color1: "#172554", color2: "#0b1220", border: 14, borderColor: "#fcd34d" };
      layers = [L("shape", { shape: "star", size: 200, x: S / 2, y: S * 0.43, gradient: true, color1: "#fde68a", color2: "#f59e0b", stroke: true, strokeColor: "#0b1220", strokeWidth: 6 }),
      L("text", { text: "STARS", font: "Anton", size: 86, x: S / 2, y: S * 0.82, gradient: false, color1: "#fde68a", stroke: true, strokeColor: "#0b1220", strokeWidth: 7 })];
    },
  };
  const presetsEl = document.getElementById("presets");
  Object.keys(PRESETS).forEach((name) => { const b = document.createElement("button"); b.textContent = name; b.addEventListener("click", () => { PRESETS[name](); select(null); paintAll(); }); presetsEl.appendChild(b); });

  // ─── Actions globales ────────────────────────────────────────────────────────
  document.getElementById("reset").addEventListener("click", () => { badge = { ...DEFAULT_BADGE }; layers = []; select(null); paintAll(); });
  document.getElementById("randomize").addEventListener("click", randomize);
  document.getElementById("download").addEventListener("click", download);
  document.getElementById("download-2").addEventListener("click", download);

  function rnd(a) { return a[Math.floor(Math.random() * a.length)]; }
  function rndColor() { return "#" + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0"); }
  function randomize() {
    badge = { shape: rnd(BADGE_SHAPES.filter((s) => s[0] !== "none").map((s) => s[0])), bgMode: rnd(["gradient", "solid"]), color1: rndColor(), color2: rndColor(), border: 8 + Math.floor(Math.random() * 18), borderColor: rnd(["#cdd9e0", "#ffffff", rndColor()]) };
    layers = [
      L("shape", { shape: rnd(Object.keys(VECTORS)), size: 150 + Math.random() * 90, x: S / 2, y: S * 0.43, gradient: true, color1: rndColor(), color2: rndColor() }),
      L("text", { text: rnd(["NOVA", "APEX", "FURY", "ECHO", "RUSH", "TITAN"]), font: rnd(FONTS.map((f) => f[0])), size: 84, x: S / 2, y: S * 0.8, gradient: true, color1: rndColor(), color2: rndColor(), stroke: true, strokeColor: "#0c1822", strokeWidth: 7 }),
    ];
    select(null); paintAll();
  }

  function download() {
    const out = document.createElement("canvas"); out.width = out.height = 1024;
    const c = out.getContext("2d"); c.scale(1024 / S, 1024 / S); render(c, false);
    const name = layers.filter((l) => l.type === "text").map((l) => l.text).join("-").replace(/[^a-z0-9-]/gi, "").toLowerCase() || "logo";
    const a = document.createElement("a"); a.download = `logo-${name}.png`; a.href = out.toDataURL("image/png"); a.click();
  }

  // ─── Init ────────────────────────────────────────────────────────────────────
  function paintAll() { paint(); buildProps(); renderLayers(); }
  function loadFont(name) { const w = FONTS.find((f) => f[0] === name)?.[1] || 700; return document.fonts?.load ? document.fonts.load(`${w} 80px "${name}"`).catch(() => {}) : Promise.resolve(); }
  Promise.all(FONTS.map((f) => loadFont(f[0]))).then(() => { PRESETS["RLC-HESS"](); select(null); paintAll(); });
  paintAll();
})();
