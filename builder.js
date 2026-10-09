/* Flowchart builder: drag shapes, draw arrows, edit each step, then run or step through the chart. */
(function () {
  "use strict";

  const root = document.getElementById("builder");
  if (!root) return;

  const NS = "http://www.w3.org/2000/svg";
  let W = 900;
  const H = 560;
  const STORE = "bc1014-flowchart-v1";
  const MAX_STEPS = 5000;
  const COMPARE = ["=", "≠", "<", "≤", ">", "≥"];
  const INSERTS = ["+", "-", "*", "/", "%", "(", ")", "[", "]", "and", "or", "not",
    "min(", "max(", "length(", "floor(", "abs(", "minIndex("];

  const svg = root.querySelector(".fb-canvas");
  const panel = root.querySelector(".fb-panel");
  const status = root.querySelector(".fb-status");
  const inputsBox = root.querySelector(".fb-inputs");
  const outBox = root.querySelector(".fb-out");
  const varsBox = root.querySelector(".fb-vars");

  let chart = load() || example("power");
  let selected = null;          // { type: "node" | "edge", id }
  let drag = null;              // node move, bend move, or new arrow
  let run = null;               // execution state
  let lastExpr = null;          // last focused expression field in the panel
  const inputValues = {};

  /* ---------- chart model ---------- */

  function newId() { return chart.next++; }

  function nodeById(id) { return chart.nodes.find((n) => n.id === id); }

  function makeNode(kind, x, y) {
    const n = { id: newId(), kind: kind, x: x, y: y };
    if (kind === "io") Object.assign(n, { mode: "Output", text: "x" });
    if (kind === "op") Object.assign(n, { mode: "set", target: "x", expr: "0", args: ["list", "i", "j"] });
    if (kind === "dec") Object.assign(n, { left: "x", op: ">", right: "0" });
    return n;
  }

  function label(n) {
    if (n.kind === "io") return n.mode + ": " + n.text;
    if (n.kind === "dec") return n.left + " " + n.op + " " + n.right + "?";
    if (n.mode === "swap") return "swap(" + n.args.join(", ") + ")";
    if (n.mode === "getNext") return "getNext(" + n.args[0] + ")";
    return "set " + n.target + " = " + n.expr;
  }

  function size(n) {
    const t = label(n).length * 8.6;
    if (n.kind === "io") return { w: Math.max(140, t + 60), h: 62 };
    if (n.kind === "dec") return { w: Math.max(160, t * 1.5 + 50), h: 96 };
    return { w: Math.max(130, t + 36), h: 48 };
  }

  function outgoing(id) { return chart.edges.filter((e) => e.from === id); }

  function example(name) {
    const c = { next: 1, nodes: [], edges: [] };
    const add = (n, props) => { const id = c.next++; c.nodes.push(Object.assign({ id: id }, n, props)); return id; };
    const link = (from, to, lbl, bend) => c.edges.push({ id: c.next++, from: from, to: to, label: lbl || "", bend: bend || null });
    if (name === "power") {
      const a = add({ kind: "io", x: 300, y: 50 }, { mode: "Input", text: "number n" });
      const b = add({ kind: "op", x: 300, y: 140 }, { mode: "set", target: "p", expr: "1", args: ["list", "i", "j"] });
      const d = add({ kind: "dec", x: 300, y: 245 }, { left: "p * 2", op: ">", right: "n" });
      const o = add({ kind: "io", x: 540, y: 245 }, { mode: "Output", text: "p" });
      const s = add({ kind: "op", x: 300, y: 360 }, { mode: "set", target: "p", expr: "p * 2", args: ["list", "i", "j"] });
      link(a, b); link(b, d); link(d, o, "YES"); link(d, s, "NO"); link(s, d, "", { x: 90, y: 300 });
    } else if (name === "sum") {
      const a = add({ kind: "io", x: 300, y: 40 }, { mode: "Input", text: "list" });
      const b = add({ kind: "op", x: 300, y: 115 }, { mode: "set", target: "sum", expr: "0", args: ["list", "i", "j"] });
      const c2 = add({ kind: "op", x: 300, y: 180 }, { mode: "set", target: "i", expr: "1", args: ["list", "i", "j"] });
      const d = add({ kind: "dec", x: 300, y: 280 }, { left: "i", op: ">", right: "length(list)" });
      const o = add({ kind: "io", x: 570, y: 280 }, { mode: "Output", text: "sum" });
      const s1 = add({ kind: "op", x: 300, y: 390 }, { mode: "set", target: "sum", expr: "sum + list[i]", args: ["list", "i", "j"] });
      const s2 = add({ kind: "op", x: 300, y: 460 }, { mode: "set", target: "i", expr: "i + 1", args: ["list", "i", "j"] });
      link(a, b); link(b, c2); link(c2, d); link(d, o, "YES"); link(d, s1, "NO"); link(s1, s2);
      link(s2, d, "", { x: 70, y: 370 });
    }
    return c;
  }

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(chart)); } catch (e) { /* storage unavailable */ }
  }

  function load() {
    try {
      const c = JSON.parse(localStorage.getItem(STORE));
      if (c && Array.isArray(c.nodes) && Array.isArray(c.edges)) return c;
    } catch (e) { /* ignore */ }
    return null;
  }

  function changed() {
    stopRun();
    save();
    render();
    renderInputs();
  }

  /* ---------- drawing ---------- */

  function el(name, attrs, text) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
    if (text != null) node.textContent = text;
    return node;
  }

  function boundary(n, tx, ty) {
    const s = size(n);
    const hw = s.w / 2;
    const hh = s.h / 2;
    const dx = tx - n.x;
    const dy = ty - n.y;
    if (dx === 0 && dy === 0) return { x: n.x, y: n.y };
    let t;
    if (n.kind === "io") t = 1 / Math.sqrt((dx / hw) ** 2 + (dy / hh) ** 2);
    else if (n.kind === "dec") t = 1 / (Math.abs(dx) / hw + Math.abs(dy) / hh);
    else t = Math.min(dx ? hw / Math.abs(dx) : Infinity, dy ? hh / Math.abs(dy) : Infinity);
    return { x: n.x + dx * t, y: n.y + dy * t };
  }

  function edgePoints(e) {
    const a = nodeById(e.from);
    const b = nodeById(e.to);
    if (!a || !b) return null;
    const bx = e.bend ? e.bend.x : null;
    if (bx == null || Math.abs(bx - a.x) < 1 || Math.abs(bx - b.x) < 1) {
      return [boundary(a, b.x, b.y), boundary(b, a.x, a.y)];
    }
    // A bent arrow leaves sideways, runs vertically at x = bx, and enters the target sideways.
    const p0 = boundary(a, bx, a.y);
    const p1 = boundary(b, bx, b.y);
    return [p0, { x: bx, y: p0.y }, { x: bx, y: p1.y }, p1];
  }

  function shapeFor(n, cls) {
    const s = size(n);
    if (n.kind === "io") {
      return el("ellipse", { cx: n.x, cy: n.y, rx: s.w / 2, ry: s.h / 2, class: cls });
    }
    if (n.kind === "dec") {
      const pts = [[n.x, n.y - s.h / 2], [n.x + s.w / 2, n.y], [n.x, n.y + s.h / 2], [n.x - s.w / 2, n.y]];
      return el("polygon", { points: pts.map((p) => p.join(",")).join(" "), class: cls });
    }
    return el("rect", { x: n.x - s.w / 2, y: n.y - s.h / 2, width: s.w, height: s.h, class: cls });
  }

  function render() {
    W = Math.max(480, Math.round(svg.clientWidth || W));
    svg.innerHTML = "";
    svg.style.height = H + "px";
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    const defs = el("defs");
    const marker = el("marker", { id: "fb-arrow", viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "8", markerHeight: "8", orient: "auto" });
    marker.appendChild(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#111" }));
    defs.appendChild(marker);
    svg.appendChild(defs);
    svg.appendChild(el("rect", { x: 0, y: 0, width: W, height: H, class: "fb-bg" }));

    chart.edges.forEach((e) => {
      const pts = edgePoints(e);
      if (!pts) return;
      const d = pts.map((p, i) => (i ? "L" : "M") + p.x.toFixed(1) + " " + p.y.toFixed(1)).join(" ");
      const g = el("g", { class: "fb-edge" + (isSel("edge", e.id) ? " sel" : ""), "data-edge": e.id });
      g.appendChild(el("path", { d: d, class: "fb-hit" }));
      g.appendChild(el("path", { d: d, class: "fb-line", "marker-end": "url(#fb-arrow)" }));
      if (e.label) {
        const a = pts[0];
        const b = pts[1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const attrs = { class: "fb-tag" };
        if (Math.abs(dx) > Math.abs(dy)) {
          Object.assign(attrs, { x: a.x + (dx > 0 ? 6 : -6), y: a.y - 7, "text-anchor": dx > 0 ? "start" : "end" });
        } else {
          Object.assign(attrs, { x: a.x + 7, y: a.y + (dy > 0 ? 16 : -8) });
        }
        g.appendChild(el("text", attrs, e.label));
      }
      if (isSel("edge", e.id)) {
        const first = pts[0];
        const last = pts[pts.length - 1];
        const mid = pts.length === 4
          ? { x: pts[1].x, y: (pts[1].y + pts[2].y) / 2 }
          : { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
        g.appendChild(el("circle", { cx: mid.x, cy: mid.y, r: 8, class: "fb-bend", "data-bend": e.id }));
      }
      svg.appendChild(g);
    });

    chart.nodes.forEach((n) => {
      const cls = ["fb-node"];
      if (isSel("node", n.id)) cls.push("sel");
      if (run && run.current === n.id) cls.push(run.error ? "err" : "cur");
      const g = el("g", { class: cls.join(" "), "data-node": n.id });
      g.appendChild(shapeFor(n, "fb-shape"));
      g.appendChild(el("text", { x: n.x, y: n.y + 5, "text-anchor": "middle", class: "fb-label" }, label(n)));
      const s = size(n);
      [[0, -s.h / 2], [s.w / 2, 0], [0, s.h / 2], [-s.w / 2, 0]].forEach((p) => {
        g.appendChild(el("circle", { cx: n.x + p[0], cy: n.y + p[1], r: 7, class: "fb-port", "data-port": n.id }));
      });
      svg.appendChild(g);
    });

    if (drag && drag.type === "arrow") {
      const a = nodeById(drag.from);
      const p = boundary(a, drag.x, drag.y);
      svg.appendChild(el("path", { d: "M" + p.x + " " + p.y + " L" + drag.x + " " + drag.y, class: "fb-line fb-temp", "marker-end": "url(#fb-arrow)" }));
    }
  }

  function isSel(type, id) { return selected && selected.type === type && selected.id === id; }

  /* ---------- pointer handling ---------- */

  function toSvg(evt) {
    const pt = svg.createSVGPoint();
    pt.x = evt.clientX;
    pt.y = evt.clientY;
    const p = pt.matrixTransform(svg.getScreenCTM().inverse());
    return { x: Math.max(10, Math.min(W - 10, p.x)), y: Math.max(10, Math.min(H - 10, p.y)) };
  }

  function nodeAt(evt) {
    const hit = document.elementFromPoint(evt.clientX, evt.clientY);
    const g = hit && hit.closest ? hit.closest("[data-node]") : null;
    return g ? Number(g.getAttribute("data-node")) : null;
  }

  svg.addEventListener("pointerdown", (evt) => {
    const t = evt.target;
    const p = toSvg(evt);
    if (t.hasAttribute("data-port")) {
      drag = { type: "arrow", from: Number(t.getAttribute("data-port")), x: p.x, y: p.y };
    } else if (t.hasAttribute("data-bend")) {
      drag = { type: "bend", id: Number(t.getAttribute("data-bend")) };
    } else if (t.closest("[data-node]")) {
      const id = Number(t.closest("[data-node]").getAttribute("data-node"));
      const n = nodeById(id);
      drag = { type: "move", id: id, dx: n.x - p.x, dy: n.y - p.y, moved: false };
      select({ type: "node", id: id });
    } else if (t.closest("[data-edge]")) {
      select({ type: "edge", id: Number(t.closest("[data-edge]").getAttribute("data-edge")) });
      return;
    } else {
      select(null);
      return;
    }
    try { svg.setPointerCapture(evt.pointerId); } catch (e) { /* capture is optional */ }
    evt.preventDefault();
  });

  svg.addEventListener("pointermove", (evt) => {
    if (!drag) return;
    const p = toSvg(evt);
    if (drag.type === "move") {
      const n = nodeById(drag.id);
      n.x = Math.round(p.x + drag.dx);
      n.y = Math.round(p.y + drag.dy);
      drag.moved = true;
    } else if (drag.type === "bend") {
      chart.edges.find((e) => e.id === drag.id).bend = { x: Math.round(p.x), y: Math.round(p.y) };
    } else {
      drag.x = p.x;
      drag.y = p.y;
    }
    render();
  });

  svg.addEventListener("pointerup", (evt) => {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (d.type === "arrow") {
      const target = nodeAt(evt);
      connect(d.from, target);
    } else {
      save();
    }
    render();
  });

  function connect(from, to) {
    if (to == null) { say("Let go on top of a shape to draw an arrow to it."); return; }
    if (to === from) { say("An arrow has to go to a different shape."); return; }
    const a = nodeById(from);
    const out = outgoing(from);
    let lbl = "";
    if (a.kind === "dec") {
      const used = out.map((e) => e.label);
      if (!used.includes("YES")) lbl = "YES";
      else if (!used.includes("NO")) lbl = "NO";
      else { say("A diamond already has its YES and NO arrows. Delete one first."); return; }
    } else if (out.length) {
      say("A " + (a.kind === "io" ? "oval" : "rectangle") + " has only one arrow out. Delete the old one first.");
      return;
    }
    const e = { id: newId(), from: from, to: to, label: lbl, bend: null };
    chart.edges.push(e);
    say("");
    select({ type: "edge", id: e.id });
    changed();
  }

  /* palette: drag a shape onto the canvas, or click to add it */
  root.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("pointerdown", (evt) => {
      const kind = btn.getAttribute("data-add");
      const ghost = btn.cloneNode(true);
      ghost.classList.add("fb-ghost");
      document.body.appendChild(ghost);
      const moveGhost = (e) => { ghost.style.left = e.clientX - 50 + "px"; ghost.style.top = e.clientY - 24 + "px"; };
      moveGhost(evt);
      const start = { x: evt.clientX, y: evt.clientY };
      const onMove = (e) => moveGhost(e);
      const onUp = (e) => {
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
        ghost.remove();
        const r = svg.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        const clicked = Math.hypot(e.clientX - start.x, e.clientY - start.y) < 5;
        let p = null;
        if (inside && !clicked) p = toSvg(e);
        else if (clicked) p = freeSpot();
        if (!p) return;
        const n = makeNode(kind, Math.round(p.x), Math.round(p.y));
        chart.nodes.push(n);
        select({ type: "node", id: n.id });
        changed();
      };
      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
      evt.preventDefault();
    });
  });

  function freeSpot() {
    const bottom = chart.nodes.reduce((m, n) => Math.max(m, n.y + size(n).h / 2), 0);
    return { x: W / 2, y: Math.min(H - 60, bottom + 70) };
  }

  document.addEventListener("keydown", (evt) => {
    if (!selected) return;
    if (evt.key !== "Delete" && evt.key !== "Backspace") return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (!root.contains(document.activeElement) && document.activeElement !== document.body) return;
    evt.preventDefault();
    removeSelected();
  });

  function removeSelected() {
    if (!selected) return;
    if (selected.type === "node") {
      chart.nodes = chart.nodes.filter((n) => n.id !== selected.id);
      chart.edges = chart.edges.filter((e) => e.from !== selected.id && e.to !== selected.id);
    } else {
      chart.edges = chart.edges.filter((e) => e.id !== selected.id);
    }
    select(null);
    changed();
  }

  /* ---------- side panel ---------- */

  function select(sel) {
    selected = sel;
    renderPanel();
    render();
  }

  function field(labelText, value, onInput, opts) {
    const wrap = document.createElement("label");
    wrap.className = "fb-field";
    wrap.append(document.createTextNode(labelText));
    const input = document.createElement("input");
    input.value = value;
    input.spellcheck = false;
    if (opts && opts.placeholder) input.placeholder = opts.placeholder;
    input.addEventListener("input", () => { onInput(input.value); changed(); });
    if (!opts || opts.expr !== false) input.addEventListener("focus", () => { lastExpr = input; });
    wrap.append(input);
    return wrap;
  }

  function choice(labelText, value, options, onChange) {
    const wrap = document.createElement("label");
    wrap.className = "fb-field";
    wrap.append(document.createTextNode(labelText));
    const sel = document.createElement("select");
    options.forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o[0];
      opt.textContent = o[1];
      if (o[0] === value) opt.selected = true;
      sel.append(opt);
    });
    sel.addEventListener("change", () => { onChange(sel.value); changed(); renderPanel(); });
    wrap.append(sel);
    return wrap;
  }

  function insertButtons() {
    const box = document.createElement("div");
    box.className = "fb-inserts";
    INSERTS.forEach((s) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ghost";
      b.textContent = s;
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => {
        if (!lastExpr || !panel.contains(lastExpr)) return;
        const spaced = ["+", "-", "*", "/", "%", "and", "or"].includes(s);
        const word = spaced ? " " + s + " " : s === "not" ? "not " : s;
        const a = lastExpr.selectionStart;
        const z = lastExpr.selectionEnd;
        lastExpr.value = lastExpr.value.slice(0, a) + word + lastExpr.value.slice(z);
        lastExpr.selectionStart = lastExpr.selectionEnd = a + word.length;
        lastExpr.dispatchEvent(new Event("input"));
        lastExpr.focus();
      });
      box.append(b);
    });
    return box;
  }

  function renderPanel() {
    panel.innerHTML = "";
    lastExpr = null;
    const h = document.createElement("h4");
    panel.append(h);
    if (!selected) {
      h.textContent = "How to use it";
      const ul = document.createElement("ul");
      [
        "Drag a shape from the top bar onto the canvas, or click it.",
        "Drag from a dot on a shape to another shape to draw an arrow.",
        "The first arrow out of a diamond is YES and the second is NO.",
        "Click a shape or an arrow to edit or delete it.",
        "Drag the round handle on a selected arrow to bend it."
      ].forEach((t) => { const li = document.createElement("li"); li.textContent = t; ul.append(li); });
      panel.append(ul);
      panel.append(functionHelp());
      return;
    }
    if (selected.type === "edge") {
      const e = chart.edges.find((x) => x.id === selected.id);
      h.textContent = "Arrow";
      if (nodeById(e.from).kind === "dec") {
        panel.append(choice("Label", e.label, [["YES", "YES"], ["NO", "NO"]], (v) => {
          const other = outgoing(e.from).find((x) => x !== e && x.label === v);
          if (other) other.label = e.label;
          e.label = v;
        }));
      }
      panel.append(actionRow([
        ["Straighten", () => { e.bend = null; changed(); }],
        ["Delete arrow", removeSelected]
      ]));
      return;
    }
    const n = nodeById(selected.id);
    if (n.kind === "io") {
      h.textContent = "Oval: input or output";
      panel.append(choice("Kind", n.mode, [["Input", "Input"], ["Output", "Output"]], (v) => { n.mode = v; }));
      panel.append(field(n.mode === "Input" ? "Names, separated by commas" : "Values to output", n.text, (v) => { n.text = v; },
        { placeholder: n.mode === "Input" ? "list, number n" : "count" }));
    } else if (n.kind === "dec") {
      h.textContent = "Diamond: yes/no question";
      panel.append(field("Left side", n.left, (v) => { n.left = v; }));
      panel.append(choice("Compare", n.op, COMPARE.map((c) => [c, c]), (v) => { n.op = v; }));
      panel.append(field("Right side", n.right, (v) => { n.right = v; }));
    } else {
      h.textContent = "Rectangle: instruction";
      panel.append(choice("Instruction", n.mode, [["set", "set variable = value"], ["swap", "swap(list, i, j)"], ["getNext", "getNext(n)"]], (v) => {
        n.mode = v;
        if (v === "getNext" && (!n.args[0] || n.args[0] === "list")) n.args[0] = "n";
        if (v === "swap" && n.args[0] === "n") n.args = ["list", "i", "j"];
      }));
      if (n.mode === "set") {
        panel.append(field("Variable", n.target, (v) => { n.target = v; }, { placeholder: "count  or  list[i]" }));
        panel.append(field("New value", n.expr, (v) => { n.expr = v; }));
      } else if (n.mode === "swap") {
        ["List", "First index", "Second index"].forEach((t, i) => {
          panel.append(field(t, n.args[i] || "", (v) => { n.args[i] = v; }));
        });
      } else {
        panel.append(field("Variable to fill with the next number", n.args[0], (v) => { n.args[0] = v; }));
      }
    }
    if (n.kind !== "io" || n.mode === "Output") {
      const p = document.createElement("p");
      p.className = "fb-hint";
      p.textContent = "Click a field, then click a button to insert it:";
      panel.append(p, insertButtons());
    }
    panel.append(actionRow([["Delete shape", removeSelected]]));
    panel.append(functionHelp());
  }

  function actionRow(items) {
    const row = document.createElement("div");
    row.className = "fb-actions";
    items.forEach((it) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "ghost";
      b.textContent = it[0];
      b.addEventListener("click", it[1]);
      row.append(b);
    });
    return row;
  }

  function functionHelp() {
    const d = document.createElement("details");
    d.className = "fb-help";
    const s = document.createElement("summary");
    s.textContent = "Built-in functions";
    d.append(s);
    const ul = document.createElement("ul");
    [
      ["length(list)", "number of elements"],
      ["list[i]", "element at position i, starting from 1"],
      ["min(a, b), max(a, b)", "smaller or larger value. min(list) also works"],
      ["minIndex(list, i)", "position of the smallest element from position i to the end"],
      ["floor(x)", "x rounded down"],
      ["abs(x)", "distance from 0"],
      ["swap(list, i, j)", "instruction: trade list[i] and list[j]"],
      ["getNext(n)", "instruction: read the next number into n"]
    ].forEach((r) => {
      const li = document.createElement("li");
      const c = document.createElement("code");
      c.textContent = r[0];
      li.append(c, document.createTextNode(": " + r[1]));
      ul.append(li);
    });
    d.append(ul);
    return d;
  }

  function say(msg) { status.textContent = msg; }

  /* ---------- expressions ---------- */

  function tokenize(src) {
    const out = [];
    let i = 0;
    const s = src.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        out.push({ t: "num", v: Number(s.slice(i, j)) });
        i = j;
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
        out.push({ t: "id", v: s.slice(i, j) });
        i = j;
        continue;
      }
      if (c === '"' || c === "'") {
        const j = s.indexOf(c, i + 1);
        if (j < 0) throw new Error("missing closing quote");
        out.push({ t: "str", v: s.slice(i + 1, j) });
        i = j + 1;
        continue;
      }
      const two = s.slice(i, i + 2);
      if (["<=", ">=", "!=", "==", "&&", "||"].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
      if ("+-*/%()[],<>=!≤≥≠".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
      throw new Error("I don't understand the character " + c);
    }
    return out;
  }

  function parse(src) {
    const toks = tokenize(src);
    let k = 0;
    const peek = () => toks[k];
    const isOp = (v) => peek() && peek().t === "op" && peek().v === v;
    const isWord = (v) => peek() && peek().t === "id" && peek().v.toLowerCase() === v;
    const expect = (v) => { if (!isOp(v)) throw new Error("expected " + v); k++; };

    function orExpr() {
      let left = andExpr();
      while (isOp("||") || isWord("or")) { k++; left = { op: "or", a: left, b: andExpr() }; }
      return left;
    }
    function andExpr() {
      let left = notExpr();
      while (isOp("&&") || isWord("and")) { k++; left = { op: "and", a: left, b: notExpr() }; }
      return left;
    }
    function notExpr() {
      if (isOp("!") || isWord("not")) { k++; return { op: "not", a: notExpr() }; }
      return cmpExpr();
    }
    function cmpExpr() {
      const left = addExpr();
      const map = { "=": "=", "==": "=", "≠": "≠", "!=": "≠", "<": "<", "≤": "≤", "<=": "≤", ">": ">", "≥": "≥", ">=": "≥" };
      if (peek() && peek().t === "op" && map[peek().v]) {
        const op = map[toks[k++].v];
        return { op: op, a: left, b: addExpr() };
      }
      return left;
    }
    function addExpr() {
      let left = mulExpr();
      while (isOp("+") || isOp("-")) { const op = toks[k++].v; left = { op: op, a: left, b: mulExpr() }; }
      return left;
    }
    function mulExpr() {
      let left = unary();
      while (isOp("*") || isOp("/") || isOp("%")) { const op = toks[k++].v; left = { op: op, a: left, b: unary() }; }
      return left;
    }
    function unary() {
      if (isOp("-")) { k++; return { op: "neg", a: unary() }; }
      return postfix();
    }
    function postfix() {
      let e = primary();
      while (isOp("[")) { k++; const idx = orExpr(); expect("]"); e = { op: "index", a: e, b: idx }; }
      return e;
    }
    function primary() {
      const t = peek();
      if (!t) throw new Error("something is missing at the end");
      k++;
      if (t.t === "num") return { op: "lit", v: t.v };
      if (t.t === "str") return { op: "lit", v: t.v };
      if (t.t === "id") {
        if (isOp("(")) {
          k++;
          const args = [];
          if (!isOp(")")) {
            args.push(orExpr());
            while (isOp(",")) { k++; args.push(orExpr()); }
          }
          expect(")");
          return { op: "call", name: t.v, args: args };
        }
        const low = t.v.toLowerCase();
        if (low === "true" || low === "false") return { op: "lit", v: low === "true" };
        return { op: "var", name: t.v };
      }
      if (t.v === "(") { const e = orExpr(); expect(")"); return e; }
      if (t.v === "[") {
        const items = [];
        if (!isOp("]")) {
          items.push(orExpr());
          while (isOp(",")) { k++; items.push(orExpr()); }
        }
        expect("]");
        return { op: "list", items: items };
      }
      throw new Error("unexpected " + t.v);
    }

    const list = [orExpr()];
    while (isOp(",")) { k++; list.push(orExpr()); }
    if (k < toks.length) throw new Error("unexpected " + toks[k].v);
    return list;
  }

  function evalOne(src, vars) {
    const list = parse(src);
    if (list.length !== 1) throw new Error("expected one value in " + src);
    return evaluate(list[0], vars);
  }

  function num(v, what) {
    if (typeof v !== "number") throw new Error(what + " needs a number, not " + show(v));
    return v;
  }

  function at(list, i) {
    if (!Array.isArray(list) && typeof list !== "string") throw new Error(show(list) + " is not a list");
    num(i, "an index");
    if (i < 1 || i > list.length || i !== Math.floor(i)) {
      throw new Error("position " + show(i) + " does not exist. The list has length " + list.length + ".");
    }
    return list[i - 1];
  }

  function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

  function evaluate(e, vars) {
    switch (e.op) {
      case "lit": return e.v;
      case "var":
        if (!(e.name in vars)) throw new Error(e.name + " has no value yet");
        return vars[e.name];
      case "list": return e.items.map((x) => evaluate(x, vars));
      case "index": return at(evaluate(e.a, vars), evaluate(e.b, vars));
      case "neg": return -num(evaluate(e.a, vars), "-");
      case "not": return !truth(evaluate(e.a, vars));
      case "and": return truth(evaluate(e.a, vars)) && truth(evaluate(e.b, vars));
      case "or": return truth(evaluate(e.a, vars)) || truth(evaluate(e.b, vars));
      case "call": return callFn(e.name, e.args.map((x) => evaluate(x, vars)));
      default: break;
    }
    const a = evaluate(e.a, vars);
    const b = evaluate(e.b, vars);
    switch (e.op) {
      case "+":
        if (typeof a === "string" || typeof b === "string") return show(a) + show(b);
        return num(a, "+") + num(b, "+");
      case "-": return num(a, "-") - num(b, "-");
      case "*": return num(a, "*") * num(b, "*");
      case "/":
        if (num(b, "/") === 0) throw new Error("division by zero");
        return num(a, "/") / b;
      case "%":
        if (num(b, "%") === 0) throw new Error("remainder by zero");
        return num(a, "%") % b;
      case "=": return same(a, b);
      case "≠": return !same(a, b);
      case "<": return num(a, "<") < num(b, "<");
      case "≤": return num(a, "≤") <= num(b, "≤");
      case ">": return num(a, ">") > num(b, ">");
      case "≥": return num(a, "≥") >= num(b, "≥");
      default: throw new Error("unknown operator " + e.op);
    }
  }

  function truth(v) {
    if (typeof v !== "boolean") throw new Error("a yes/no question needs true or false, not " + show(v));
    return v;
  }

  function callFn(name, args) {
    const f = name.toLowerCase();
    const listOrArgs = () => (args.length === 1 && Array.isArray(args[0]) ? args[0] : args);
    if (f === "length") {
      if (!Array.isArray(args[0]) && typeof args[0] !== "string") throw new Error("length needs a list");
      return args[0].length;
    }
    if (f === "min" || f === "max") {
      const xs = listOrArgs();
      if (!xs.length) throw new Error(f + " of an empty list");
      xs.forEach((x) => num(x, f));
      return f === "min" ? Math.min.apply(null, xs) : Math.max.apply(null, xs);
    }
    if (f === "floor") return Math.floor(num(args[0], "floor"));
    if (f === "abs") return Math.abs(num(args[0], "abs"));
    if (f === "minindex") {
      const list = args[0];
      const from = args.length > 1 ? args[1] : 1;
      at(list, from);
      let best = from;
      for (let i = from + 1; i <= list.length; i++) if (list[i - 1] < list[best - 1]) best = i;
      return best;
    }
    if (f === "swap" || f === "getnext") throw new Error(name + " is an instruction. Put it in its own rectangle.");
    throw new Error("there is no function named " + name);
  }

  function show(v) {
    if (Array.isArray(v)) return "[" + v.map(show).join(", ") + "]";
    if (typeof v === "boolean") return v ? "True" : "False";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Number(v.toFixed(6)));
    return String(v);
  }

  /* ---------- running ---------- */

  function inputNames() {
    const start = chart.nodes.find((n) => n.kind === "io" && n.mode === "Input");
    if (!start) return [];
    return start.text.split(",").map((part) => {
      const words = part.trim().match(/[A-Za-z_][A-Za-z0-9_]*/g);
      return words ? words[words.length - 1] : null;
    }).filter(Boolean);
  }

  function usesGetNext() { return chart.nodes.some((n) => n.kind === "op" && n.mode === "getNext"); }

  function renderInputs() {
    inputsBox.innerHTML = "";
    const names = inputNames();
    if (usesGetNext()) names.push("numbers to read");
    if (!names.length) {
      inputsBox.textContent = "Add an Input oval to give the chart its inputs.";
      return;
    }
    names.forEach((name) => {
      const wrap = document.createElement("label");
      wrap.className = "fb-field inline";
      wrap.append(document.createTextNode(name + " ="));
      const input = document.createElement("input");
      input.value = inputValues[name] != null ? inputValues[name] : (name === "numbers to read" ? "3 5 5 2 -1" : "");
      input.placeholder = name === "numbers to read" ? "3 5 5 2 -1" : "7  or  [5, 8, 3]";
      input.spellcheck = false;
      input.addEventListener("input", () => { inputValues[name] = input.value; stopRun(); render(); });
      inputValues[name] = input.value;
      wrap.append(input);
      inputsBox.append(wrap);
    });
  }

  function startRun() {
    const start = chart.nodes.find((n) => n.kind === "io" && n.mode === "Input");
    if (!start) { say("Add an Input oval so the chart knows where to start."); return null; }
    const vars = {};
    for (const name of inputNames()) {
      const raw = (inputValues[name] || "").trim();
      if (!raw) { say("Give " + name + " a value first."); return null; }
      if (/^[A-Za-z][A-Za-z ]*$/.test(raw) && !/^(true|false)$/i.test(raw)) { vars[name] = raw; continue; }
      try {
        vars[name] = evalOne(raw, {});
      } catch (e) {
        say("I can't read the value of " + name + ". Use a number like 7, a list like [5, 8, 3], or a word.");
        return null;
      }
    }
    const stream = (inputValues["numbers to read"] || "").split(/[\s,]+/).filter(Boolean).map(Number);
    say("");
    return { vars: vars, current: start.id, output: [], stream: stream, steps: 0, done: false, error: null, started: false };
  }

  function stepOnce() {
    const n = nodeById(run.current);
    run.steps++;
    if (run.steps > MAX_STEPS) throw new Error("stopped after " + MAX_STEPS + " steps. The chart may loop forever.");
    let next = null;
    const outs = outgoing(n.id);
    if (n.kind === "io") {
      if (n.mode === "Output") {
        const vals = parse(n.text).map((x) => evaluate(x, run.vars));
        run.output.push(vals.map(show).join(", "));
      }
      if (!outs.length) {
        if (n.mode === "Output") { run.done = true; return; }
        throw new Error("there is no arrow out of this oval");
      }
      next = outs[0];
    } else if (n.kind === "dec") {
      const yes = evaluate({ op: n.op, a: parse(n.left)[0], b: parse(n.right)[0] }, run.vars);
      next = outs.find((e) => e.label === (yes ? "YES" : "NO"));
      if (!next) throw new Error("the answer is " + (yes ? "YES" : "NO") + ", but there is no " + (yes ? "YES" : "NO") + " arrow");
    } else {
      if (n.mode === "set") assign(n.target, evalOne(n.expr, run.vars));
      else if (n.mode === "swap") {
        const name = n.args[0].trim();
        const list = run.vars[name];
        const i = evalOne(n.args[1], run.vars);
        const j = evalOne(n.args[2], run.vars);
        const a = at(list, i);
        const b = at(list, j);
        list[i - 1] = b;
        list[j - 1] = a;
      } else {
        if (!run.stream.length) throw new Error("getNext: there are no numbers left to read");
        assign(n.args[0], run.stream.shift());
      }
      if (!outs.length) throw new Error("there is no arrow out of this rectangle");
      next = outs[0];
    }
    run.current = next.to;
  }

  function assign(target, value) {
    const m = target.trim().match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:\[(.+)\])?$/);
    if (!m) throw new Error("can't set " + target + ". Use a name like count or list[i].");
    if (m[2] === undefined) { run.vars[m[1]] = Array.isArray(value) ? value.slice() : value; return; }
    const list = run.vars[m[1]];
    const i = evalOne(m[2], run.vars);
    at(list, i);
    list[i - 1] = value;
  }

  function advance(all) {
    if (!run || run.done || run.error) run = startRun();
    if (!run) {
      outBox.textContent = status.textContent;
      outBox.className = "fb-out stdout bad";
      say("");
      return;
    }
    try {
      if (!run.started) {
        run.started = true;
        if (!all) { showRun(); return; }
      }
      do { stepOnce(); } while (all && !run.done);
    } catch (e) {
      run.error = e.message;
    }
    showRun();
  }

  function stopRun() {
    run = null;
    outBox.textContent = "Output";
    outBox.className = "fb-out stdout quiet";
    varsBox.innerHTML = "";
  }

  function showRun() {
    render();
    const lines = run.output.slice();
    if (run.error) lines.push("Error: " + run.error);
    else if (run.done) lines.push("(finished)");
    outBox.textContent = lines.length ? lines.join("\n") : "(no output yet)";
    outBox.className = "fb-out stdout" + (run.error ? " bad" : lines.length ? "" : " quiet");
    varsBox.innerHTML = "";
    const names = Object.keys(run.vars);
    if (!names.length) return;
    const table = document.createElement("table");
    const head = table.insertRow();
    const body = table.insertRow();
    names.forEach((k) => {
      const th = document.createElement("th");
      th.textContent = k;
      head.append(th);
      body.insertCell().textContent = show(run.vars[k]);
    });
    varsBox.append(table);
  }

  root.querySelector("[data-run]").addEventListener("click", () => { run = null; advance(true); });
  root.querySelector("[data-step]").addEventListener("click", () => advance(false));
  root.querySelector("[data-reset]").addEventListener("click", () => { stopRun(); render(); });
  root.querySelector("[data-clear]").addEventListener("click", () => {
    if (chart.nodes.length && !confirm("Clear the whole chart?")) return;
    chart = { next: 1, nodes: [], edges: [] };
    select(null);
    changed();
  });
  root.querySelector("[data-example]").addEventListener("change", (evt) => {
    const name = evt.target.value;
    evt.target.value = "";
    if (!name) return;
    if (chart.nodes.length && !confirm("Replace the current chart with this example?")) return;
    chart = example(name);
    if (name === "sum") inputValues.list = "[4, 7, 1]";
    if (name === "power") inputValues.n = "20";
    select(null);
    changed();
  });

  window.addEventListener("resize", () => render());

  inputValues.n = "20";
  renderPanel();
  render();
  renderInputs();
  stopRun();
})();
