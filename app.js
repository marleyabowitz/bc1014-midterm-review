/* Page behavior: navigation, flowcharts, and the runnable examples. */
(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  const CHARTS = {
    power: {
      w: 700,
      h: 400,
      nodes: [
        { kind: "io", x: 170, y: 16, w: 280, h: 70, text: "Input: number n (n >= 1)" },
        { kind: "op", x: 210, y: 110, w: 200, h: 46, text: "set p = 1" },
        { kind: "dec", x: 200, y: 186, w: 220, h: 100, text: "p * 2 > n?" },
        { kind: "io", x: 500, y: 202, w: 170, h: 68, text: "Output: p" },
        { kind: "op", x: 200, y: 326, w: 220, h: 48, text: "set p = p * 2" }
      ],
      wires: [
        { points: [[310, 86], [310, 110]] },
        { points: [[310, 156], [310, 186]] },
        { points: [[420, 236], [500, 236]], label: "YES", lx: 432, ly: 228 },
        { points: [[310, 286], [310, 326]], label: "NO", lx: 318, ly: 310 },
        { points: [[200, 350], [64, 350], [64, 236], [200, 236]] }
      ]
    },
    bigger: {
      w: 800,
      h: 540,
      nodes: [
        { kind: "io", x: 220, y: 12, w: 280, h: 68, text: "Input: list, number n" },
        { kind: "op", x: 260, y: 104, w: 200, h: 46, text: "set i = 1" },
        { kind: "dec", x: 235, y: 176, w: 250, h: 104, text: "i > length?" },
        { kind: "io", x: 590, y: 196, w: 170, h: 64, text: "Output: 0" },
        { kind: "dec", x: 235, y: 318, w: 250, h: 104, text: "list[i] > n?" },
        { kind: "io", x: 590, y: 338, w: 170, h: 64, text: "Output: i" },
        { kind: "op", x: 260, y: 462, w: 200, h: 48, text: "set i = i + 1" }
      ],
      wires: [
        { points: [[360, 80], [360, 104]] },
        { points: [[360, 150], [360, 176]] },
        { points: [[485, 228], [590, 228]], label: "YES", lx: 500, ly: 220 },
        { points: [[360, 280], [360, 318]], label: "NO", lx: 368, ly: 302 },
        { points: [[485, 370], [590, 370]], label: "YES", lx: 500, ly: 362 },
        { points: [[360, 422], [360, 462]], label: "NO", lx: 368, ly: 446 },
        { points: [[260, 486], [78, 486], [78, 228], [235, 228]] }
      ]
    },
    distance: {
      w: 760,
      h: 600,
      nodes: [
        { kind: "io", x: 150, y: 12, w: 250, h: 76, text: "Input:\nnumber a, number b" },
        { kind: "op", x: 165, y: 112, w: 220, h: 62, text: "set i = a\nset j = b" },
        { kind: "dec", x: 170, y: 204, w: 210, h: 100, text: "i = 0?" },
        { kind: "io", x: 500, y: 220, w: 180, h: 68, text: "Output: j" },
        { kind: "dec", x: 170, y: 344, w: 210, h: 100, text: "j = 0?" },
        { kind: "io", x: 500, y: 360, w: 180, h: 68, text: "Output: i" },
        { kind: "op", x: 165, y: 488, w: 220, h: 62, text: "set i = i - 1\nset j = j - 1" }
      ],
      wires: [
        { points: [[275, 88], [275, 112]] },
        { points: [[275, 174], [275, 204]] },
        { points: [[380, 254], [500, 254]], label: "YES", lx: 400, ly: 244 },
        { points: [[275, 304], [275, 344]], label: "NO", lx: 284, ly: 328 },
        { points: [[380, 394], [500, 394]], label: "YES", lx: 400, ly: 384 },
        { points: [[275, 444], [275, 488]], label: "NO", lx: 284, ly: 470 },
        { points: [[165, 519], [58, 519], [58, 254], [170, 254]] }
      ]
    },
    grade: {
      w: 760,
      h: 620,
      nodes: [
        { kind: "io", x: 80, y: 10, w: 230, h: 64, text: "Input: number score" },
        { kind: "dec", x: 75, y: 104, w: 240, h: 100, text: "score >= 90?" },
        { kind: "io", x: 470, y: 122, w: 180, h: 64, text: "Output: A" },
        { kind: "dec", x: 75, y: 244, w: 240, h: 100, text: "score >= 80?" },
        { kind: "io", x: 470, y: 262, w: 180, h: 64, text: "Output: B" },
        { kind: "dec", x: 75, y: 384, w: 240, h: 100, text: "score >= 70?" },
        { kind: "io", x: 470, y: 402, w: 180, h: 64, text: "Output: C" },
        { kind: "io", x: 105, y: 524, w: 180, h: 64, text: "Output: F" }
      ],
      wires: [
        { points: [[195, 74], [195, 104]] },
        { points: [[315, 154], [470, 154]], label: "YES", lx: 340, ly: 144 },
        { points: [[195, 204], [195, 244]], label: "NO", lx: 204, ly: 228 },
        { points: [[315, 294], [470, 294]], label: "YES", lx: 340, ly: 284 },
        { points: [[195, 344], [195, 384]], label: "NO", lx: 204, ly: 368 },
        { points: [[315, 434], [470, 434]], label: "YES", lx: 340, ly: 424 },
        { points: [[195, 484], [195, 524]], label: "NO", lx: 204, ly: 508 }
      ]
    },
    digits: {
      w: 720,
      h: 460,
      nodes: [
        { kind: "io", x: 150, y: 10, w: 250, h: 64, text: "Input: number n (n >= 0)" },
        { kind: "op", x: 175, y: 96, w: 200, h: 46, text: "set sum = 0" },
        { kind: "dec", x: 165, y: 168, w: 220, h: 100, text: "n = 0?" },
        { kind: "io", x: 480, y: 184, w: 190, h: 68, text: "Output: sum" },
        { kind: "op", x: 145, y: 310, w: 260, h: 48, text: "set sum = sum + n % 10" },
        { kind: "op", x: 165, y: 384, w: 220, h: 48, text: "set n = n / 10" }
      ],
      wires: [
        { points: [[275, 74], [275, 96]] },
        { points: [[275, 142], [275, 168]] },
        { points: [[385, 218], [480, 218]], label: "YES", lx: 400, ly: 208 },
        { points: [[275, 268], [275, 310]], label: "NO", lx: 284, ly: 292 },
        { points: [[275, 358], [275, 384]] },
        { points: [[165, 408], [70, 408], [70, 218], [165, 218]] }
      ]
    },
    gcd: {
      w: 720,
      h: 500,
      nodes: [
        { kind: "io", x: 140, y: 10, w: 260, h: 70, text: "Input: a, b (both >= 1)" },
        { kind: "dec", x: 160, y: 110, w: 220, h: 100, text: "a = b?" },
        { kind: "io", x: 490, y: 126, w: 170, h: 68, text: "Output: a" },
        { kind: "dec", x: 160, y: 250, w: 220, h: 100, text: "a > b?" },
        { kind: "op", x: 470, y: 276, w: 200, h: 48, text: "set a = a - b" },
        { kind: "op", x: 170, y: 390, w: 200, h: 48, text: "set b = b - a" }
      ],
      wires: [
        { points: [[270, 80], [270, 110]] },
        { points: [[380, 160], [490, 160]], label: "YES", lx: 400, ly: 152 },
        { points: [[270, 210], [270, 250]], label: "NO", lx: 278, ly: 234 },
        { points: [[380, 300], [470, 300]], label: "YES", lx: 396, ly: 292 },
        { points: [[270, 350], [270, 390]], label: "NO", lx: 278, ly: 374 },
        { points: [[570, 324], [570, 470], [64, 470], [64, 160], [160, 160]] },
        { points: [[170, 414], [64, 414]], arrow: false }
      ]
    },
    increases: {
      w: 860,
      h: 660,
      nodes: [
        { kind: "io", x: 200, y: 8, w: 300, h: 64, text: "Input: number prev" },
        { kind: "op", x: 210, y: 90, w: 280, h: 46, text: "set cur = next number" },
        { kind: "op", x: 230, y: 152, w: 240, h: 46, text: "set count = 0" },
        { kind: "dec", x: 230, y: 220, w: 240, h: 100, text: "cur = -1?" },
        { kind: "io", x: 580, y: 236, w: 210, h: 68, text: "Output: count" },
        { kind: "dec", x: 230, y: 360, w: 240, h: 100, text: "cur > prev?" },
        { kind: "op", x: 560, y: 386, w: 250, h: 48, text: "set count = count + 1" },
        { kind: "op", x: 210, y: 510, w: 280, h: 46, text: "set prev = cur" },
        { kind: "op", x: 210, y: 576, w: 280, h: 46, text: "set cur = next number" }
      ],
      wires: [
        { points: [[350, 72], [350, 90]] },
        { points: [[350, 136], [350, 152]] },
        { points: [[350, 198], [350, 220]] },
        { points: [[470, 270], [580, 270]], label: "YES", lx: 490, ly: 260 },
        { points: [[350, 320], [350, 360]], label: "NO", lx: 358, ly: 344 },
        { points: [[470, 410], [560, 410]], label: "YES", lx: 488, ly: 400 },
        { points: [[350, 460], [350, 510]], label: "NO", lx: 358, ly: 490 },
        { points: [[685, 434], [685, 533], [490, 533]] },
        { points: [[350, 556], [350, 576]] },
        { points: [[210, 599], [72, 599], [72, 270], [230, 270]] }
      ]
    }
  };

  const INK = "#111";

  function el(name, attrs, text) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
    if (text != null) node.textContent = text;
    return node;
  }

  function drawChart(host, spec) {
    const uid = "a" + Math.random().toString(36).slice(2, 8);
    const svg = el("svg", { viewBox: "0 0 " + spec.w + " " + spec.h, class: "flow", role: "img" });
    const defs = el("defs");
    const marker = el("marker", {
      id: uid,
      viewBox: "0 0 10 10",
      refX: "8",
      refY: "5",
      markerWidth: "7",
      markerHeight: "7",
      orient: "auto"
    });
    marker.appendChild(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: INK }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    spec.wires.forEach((w) => {
      const d = w.points.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
      const attrs = { d: d, fill: "none", stroke: INK, "stroke-width": "1.7" };
      if (w.arrow !== false) attrs["marker-end"] = "url(#" + uid + ")";
      svg.appendChild(el("path", attrs));
      if (w.label) {
        svg.appendChild(el("text", { x: w.lx, y: w.ly, class: "tag" }, w.label));
      }
    });

    spec.nodes.forEach((n) => {
      const shape = { fill: "white", stroke: INK, "stroke-width": "1.7" };
      if (n.kind === "io") {
        svg.appendChild(el("ellipse", Object.assign({
          cx: n.x + n.w / 2, cy: n.y + n.h / 2, rx: n.w / 2, ry: n.h / 2
        }, shape)));
      } else if (n.kind === "dec") {
        const x = n.x, y = n.y, w = n.w, h = n.h;
        svg.appendChild(el("polygon", Object.assign({
          points: [
            [x + w / 2, y],
            [x + w, y + h / 2],
            [x + w / 2, y + h],
            [x, y + h / 2]
          ].map((p) => p.join(",")).join(" ")
        }, shape)));
      } else {
        svg.appendChild(el("rect", Object.assign({ x: n.x, y: n.y, width: n.w, height: n.h }, shape)));
      }
      const lines = n.text.split("\n");
      const lh = 18;
      const block = lines.length * lh;
      const y0 = n.y + (n.h - block) / 2 + 13;
      const text = el("text", { "text-anchor": "middle" });
      lines.forEach((line, i) => {
        text.appendChild(el("tspan", { x: n.x + n.w / 2, y: y0 + i * lh }, line));
      });
      svg.appendChild(text);
    });

    host.appendChild(svg);
  }

  function mountIde(host) {
    const sample = ReviewSamples.samples[host.dataset.sample];
    if (!sample) {
      host.textContent = "Missing example " + host.dataset.sample;
      return;
    }
    host.innerHTML = "";
    const top = document.createElement("div");
    top.className = "ide-top";
    const file = document.createElement("span");
    file.className = "ide-file";
    file.textContent = sample.label;
    const actions = document.createElement("span");
    actions.className = "ide-actions";
    const runBtn = button("Run", "");
    const traceBtn = button("Trace", "ghost");
    const resetBtn = button("Reset", "ghost");
    actions.append(runBtn, traceBtn, resetBtn);
    top.append(file, actions);

    const editor = document.createElement("div");
    editor.className = "editor";
    const gutter = document.createElement("pre");
    gutter.className = "gutter";
    const area = document.createElement("textarea");
    area.spellcheck = false;
    area.setAttribute("aria-label", sample.label);
    area.value = sample.code;
    editor.append(gutter, area);

    const out = document.createElement("pre");
    out.className = "stdout quiet";
    out.textContent = "Output";
    const trace = document.createElement("pre");
    trace.className = "traceout";
    trace.hidden = true;

    host.append(top, editor);
    if (sample.input) {
      const row = document.createElement("label");
      row.className = "in-row";
      row.append(document.createTextNode("Input "));
      const input = document.createElement("input");
      input.value = sample.input;
      input.setAttribute("aria-label", "Program input");
      row.append(input);
      host.append(row);
      host._input = input;
    }
    host.append(out, trace);

    function renumber() {
      const n = area.value.split("\n").length;
      const nums = [];
      for (let i = 1; i <= n; i++) nums.push(String(i));
      gutter.textContent = nums.join("\n");
      const h = Math.min(560, Math.max(88, n * 22 + 24));
      area.style.height = h + "px";
      gutter.style.height = h + "px";
    }
    area.addEventListener("input", renumber);
    area.addEventListener("scroll", () => { gutter.scrollTop = area.scrollTop; });
    area.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const a = area.selectionStart;
        const b = area.selectionEnd;
        area.value = area.value.slice(0, a) + "    " + area.value.slice(b);
        area.selectionStart = area.selectionEnd = a + 4;
        renumber();
      } else if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        execute(false);
      }
    });
    runBtn.addEventListener("click", () => execute(false));
    traceBtn.addEventListener("click", () => execute(true));
    resetBtn.addEventListener("click", () => {
      area.value = sample.code;
      if (host._input) host._input.value = sample.input;
      out.className = "stdout quiet";
      out.textContent = "Output";
      trace.hidden = true;
      renumber();
    });
    renumber();

    function execute(withTrace) {
      const input = host._input ? host._input.value : "";
      const result = JavaRun.run(area.value, input, { trace: withTrace });
      trace.hidden = !withTrace;
      if (result.error) {
        out.className = "stdout bad";
        out.textContent = result.error;
        trace.textContent = "";
        return;
      }
      if (result.output.length === 0) {
        out.className = "stdout quiet";
        out.textContent = "(no output)";
      } else {
        out.className = "stdout";
        out.textContent = result.output;
      }
      if (withTrace) trace.textContent = result.trace.join("\n");
    }
  }

  function button(label, ghost) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    if (ghost) b.className = ghost;
    return b;
  }

  function buildNav() {
    const box = document.getElementById("nav-links");
    const sections = Array.from(document.querySelectorAll("main section[data-nav]"));
    sections.forEach((section) => {
      const a = document.createElement("a");
      a.href = "#" + section.id;
      a.textContent = section.dataset.nav;
      box.appendChild(a);
    });
    const links = Array.from(box.querySelectorAll("a"));
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + entry.target.id));
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: 0 });
    sections.forEach((section) => obs.observe(section));
  }

  document.querySelectorAll("[data-chart]").forEach((host) => {
    drawChart(host, CHARTS[host.dataset.chart]);
  });
  document.querySelectorAll(".ide").forEach(mountIde);
  buildNav();
  document.getElementById("larger").addEventListener("click", () => {
    document.body.classList.toggle("big");
  });
})();
