var h = Object.defineProperty;
var g = (f, l, t) => l in f ? h(f, l, { enumerable: !0, configurable: !0, writable: !0, value: t }) : f[l] = t;
var u = (f, l, t) => g(f, typeof l != "symbol" ? l + "" : l, t);
class b {
  constructor() {
    u(this, "nodes", []);
    u(this, "edges", []);
  }
  addNode(l) {
    this.nodes.push(l);
  }
  addEdge(l, t) {
    return this.isCircular(l, t) ? (alert("Circular dependency detected! Connection blocked."), !1) : (this.edges.push({ source: l, target: t }), !0);
  }
  isCircular(l, t) {
    const d = [t];
    for (; d.length > 0; ) {
      const n = d.pop();
      if (n === l)
        return !0;
      this.edges.filter((r) => r.source === n).forEach((r) => d.push(r.target));
    }
    return !1;
  }
  exportJSON() {
    return {
      workflowId: `c1x-camp-${Date.now()}`,
      nodes: this.nodes,
      edges: this.edges
    };
  }
}
class w extends HTMLElement {
  constructor() {
    super();
    u(this, "engine", new b());
    u(this, "dragNode", null);
    u(this, "offset", { x: 0, y: 0 });
    u(this, "nodes", []);
    u(this, "lastSplitId", null);
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    this.render();
  }
  setupListeners() {
    var d, n, r, c;
    const t = (d = this.shadowRoot) == null ? void 0 : d.querySelector("#canvas");
    t == null || t.addEventListener("mousedown", (i) => {
      const e = i.target.closest("g.node-group");
      if (e) {
        this.dragNode = e;
        const a = this.dragNode.getCTM();
        this.offset.x = i.clientX - a.e, this.offset.y = i.clientY - a.f;
      }
    }), t == null || t.addEventListener("mousemove", (i) => {
      if (this.dragNode) {
        const e = i.clientX - this.offset.x, a = i.clientY - this.offset.y;
        this.dragNode.setAttribute("transform", `translate(${e}, ${a})`);
        const o = this.dragNode.getAttribute("data-id"), s = this.nodes.find((p) => p.id === o);
        s && (s.x = e, s.y = a), this.updateEdges();
      }
    }), window.addEventListener("mouseup", () => {
      this.dragNode = null;
    }), (n = this.shadowRoot) == null || n.querySelectorAll(".node-palette-item").forEach((i) => {
      i.addEventListener("dragstart", (e) => e.dataTransfer.setData("type", e.target.dataset.type));
    }), t == null || t.addEventListener("dragover", (i) => i.preventDefault()), t == null || t.addEventListener("drop", (i) => {
      i.preventDefault();
      const e = t.getBoundingClientRect();
      this.openConfigModal(i.dataTransfer.getData("type"), i.clientX - e.left, i.clientY - e.top);
    }), (c = (r = this.shadowRoot) == null ? void 0 : r.querySelector("#export-btn")) == null || c.addEventListener("click", () => {
      const i = this.engine.exportJSON(), e = new Blob([JSON.stringify(i, null, 2)], { type: "application/json" }), a = URL.createObjectURL(e), o = document.createElement("a");
      o.href = a, o.download = `workflow-export-${Date.now()}.json`, o.click(), URL.revokeObjectURL(a);
    });
  }
  openConfigModal(t, d, n) {
    var c, i;
    const r = document.createElement("div");
    r.className = "modal-overlay", r.innerHTML = `
      <div class="modal-content">
        <h3>Configure ${t.toUpperCase()}</h3>
        <input type="text" id="val" placeholder="Description (e.g. Abandoned users)">
        <button id="add">Apply Changes</button>
      </div>`, (c = this.shadowRoot) == null || c.appendChild(r), (i = r.querySelector("#add")) == null || i.addEventListener("click", () => {
      const e = r.querySelector("#val").value || t, a = `node-${Date.now()}`;
      let o = this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].id : null;
      this.lastSplitId && (t === "action" || t === "end") && (o = this.lastSplitId);
      const s = { id: a, type: t, x: d, y: n, text: e, parentId: o };
      this.nodes.push(s), t === "split" && (this.lastSplitId = a), this.engine.addNode({ id: a, type: t, params: { segmentName: e }, position: { x: d, y: n } }), o && this.engine.addEdge(o, a), this.renderNodeOnCanvas(a, t, d, n, e), this.updateEdges(), r.remove();
    });
  }
  renderNodeOnCanvas(t, d, n, r, c) {
    var a;
    const i = (a = this.shadowRoot) == null ? void 0 : a.querySelector("#canvas"), e = document.createElementNS("http://www.w3.org/2000/svg", "g");
    if (e.setAttribute("transform", `translate(${n}, ${r})`), e.setAttribute("class", "node-group"), e.setAttribute("data-id", t), d === "wait" || d === "end") {
      const o = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      o.setAttribute("r", "45"), o.setAttribute("fill", d === "wait" ? "#f3f4f6" : "#fee2e2"), o.setAttribute("stroke", "#9ca3af"), e.appendChild(o);
      const s = document.createElementNS("http://www.w3.org/2000/svg", "text");
      s.setAttribute("text-anchor", "middle"), s.setAttribute("dy", "5"), s.style.fontSize = "11px", s.textContent = c, e.appendChild(s);
    } else {
      const o = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      o.setAttribute("width", "220"), o.setAttribute("height", "90"), o.setAttribute("rx", "10"), o.setAttribute("fill", this.getColor(d)), o.setAttribute("stroke", "#d1d5db"), e.appendChild(o);
      const s = document.createElementNS("http://www.w3.org/2000/svg", "text");
      s.setAttribute("x", "15"), s.setAttribute("y", "25"), s.style.fontSize = "10px", s.style.fill = "#9ca3af", s.textContent = d.toUpperCase(), e.appendChild(s);
      const p = document.createElementNS("http://www.w3.org/2000/svg", "text");
      p.setAttribute("x", "15"), p.setAttribute("y", "55"), p.style.fontSize = "13px", p.style.fontWeight = "500", p.textContent = c, e.appendChild(p);
    }
    i == null || i.appendChild(e);
  }
  getColor(t) {
    return { audience: "#eff6ff", filter: "#fff7ed", split: "#f0fdf4", action: "#fefce8" }[t] || "#ffffff";
  }
  updateEdges() {
    var d;
    const t = (d = this.shadowRoot) == null ? void 0 : d.querySelector("#canvas");
    t == null || t.querySelectorAll(".edge-path").forEach((n) => n.remove()), this.nodes.forEach((n) => {
      if (n.parentId) {
        const r = this.nodes.find((c) => c.id === n.parentId);
        r && this.drawManhattanEdge(r, n);
      }
    });
  }
  drawManhattanEdge(t, d) {
    var a;
    const n = (a = this.shadowRoot) == null ? void 0 : a.querySelector("#canvas"), r = { x: t.x + 110, y: t.y + (t.type === "wait" || t.type === "end" ? 45 : 90) }, c = { x: d.x + 110, y: d.y - (d.type === "wait" || d.type === "end" ? 45 : 0) }, i = r.y + 30, e = document.createElementNS("http://www.w3.org/2000/svg", "path");
    e.setAttribute("d", `M ${r.x} ${r.y} L ${r.x} ${i} L ${c.x} ${i} L ${c.x} ${c.y}`), e.setAttribute("class", "edge-path"), e.setAttribute("stroke", "#9ca3af"), e.setAttribute("fill", "none"), e.setAttribute("stroke-width", "2"), n == null || n.prepend(e);
  }
  render() {
    this.shadowRoot && (this.shadowRoot.innerHTML = `
      <style>
        :host { --primary: #4f46e5; font-family: 'Inter', sans-serif; }
        .workflow-container { display: flex; height: 100vh; overflow: hidden; background: #fff; }
        .sidebar { width: 140px; padding: 20px; background: #f9fafb; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .node-palette-item { 
          width: 90px; padding: 12px 0; text-align: center; border: 1px solid #d1d5db; 
          cursor: grab; font-size: 12px; background: white; font-weight: 500;
        }
        .item-rect { border-radius: 8px; }
        .item-circle { border-radius: 50%; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; }
        
        .item-audience { background: #eff6ff; } .item-filter { background: #fff7ed; }
        .item-split { background: #f0fdf4; } .item-action { background: #fefce8; }
        .item-wait { background: #f3f4f6; } .item-end { background: #fee2e2; }

        .canvas-area { flex-grow: 1; position: relative; overflow: auto; background-image: radial-gradient(#e5e7eb 1.2px, transparent 1.2px); background-size: 24px 24px; }
        #canvas { min-width: 4000px; min-height: 4000px; }
        
        #export-btn { position: absolute; top: 20px; right: 40px; background: var(--primary); color: white; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; padding: 30px; border-radius: 16px; width: 320px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1); }
        input { width: 100%; padding: 12px; margin: 15px 0; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }
        #add { background: var(--primary); color: white; border: none; width: 100%; padding: 12px; border-radius: 8px; cursor: pointer; font-weight: 600; }
      </style>
      <div class="workflow-container">
        <aside class="sidebar">
          <div class="node-palette-item item-rect item-audience" draggable="true" data-type="audience">Audience</div>
          <div class="node-palette-item item-rect item-filter" draggable="true" data-type="filter">Filter</div>
          <div class="node-palette-item item-rect item-split" draggable="true" data-type="split">Split</div>
          <div class="node-palette-item item-rect item-action" draggable="true" data-type="action">Action</div>
          <div class="node-palette-item item-circle item-wait" draggable="true" data-type="wait">Wait</div>
          <div class="node-palette-item item-circle item-end" draggable="true" data-type="end">End</div>
        </aside>
        <main class="canvas-area">
          <button id="export-btn">Export JSON</button>
          <svg id="canvas" width="4000" height="4000"></svg>
        </main>
      </div>`, this.setupListeners());
  }
}
customElements.define("c1x-workflow-builder", w);
