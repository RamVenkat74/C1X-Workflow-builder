import { WorkflowEngine } from './engine';
import { NodeType } from './types';

class C1XWorkflowBuilder extends HTMLElement {
  private engine = new WorkflowEngine();
  private dragNode: SVGGElement | null = null;
  private offset = { x: 0, y: 0 };
  private nodes: any[] = [];
  private lastSplitId: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() { this.render(); }

  private setupListeners() {
    const canvas = this.shadowRoot?.querySelector('#canvas') as SVGSVGElement;

    // Movement Logic
    canvas?.addEventListener('mousedown', (e) => {
      const target = (e.target as HTMLElement).closest('g.node-group');
      if (target) {
        this.dragNode = target as unknown as SVGGElement;
        const matrix = this.dragNode.getCTM()!;
        this.offset.x = e.clientX - matrix.e;
        this.offset.y = e.clientY - matrix.f;
      }
    });

    canvas?.addEventListener('mousemove', (e) => {
      if (this.dragNode) {
        const x = e.clientX - this.offset.x;
        const y = e.clientY - this.offset.y;
        this.dragNode.setAttribute("transform", `translate(${x}, ${y})`);
        const id = this.dragNode.getAttribute('data-id');
        const node = this.nodes.find(n => n.id === id);
        if (node) { node.x = x; node.y = y; }
        this.updateEdges();
      }
    });

    window.addEventListener('mouseup', () => { this.dragNode = null; });

    // Palette Drag Logic
    this.shadowRoot?.querySelectorAll('.node-palette-item').forEach(item => {
      item.addEventListener('dragstart', (e: any) => e.dataTransfer.setData('type', e.target.dataset.type));
    });

    canvas?.addEventListener('dragover', (e) => e.preventDefault());
    canvas?.addEventListener('drop', (e: any) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      this.openConfigModal(e.dataTransfer.getData('type') as NodeType, e.clientX - rect.left, e.clientY - rect.top);
    });

    // DIRECT DOWNLOAD LOGIC
    this.shadowRoot?.querySelector('#export-btn')?.addEventListener('click', () => {
      const data = this.engine.exportJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow-export-${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  private openConfigModal(type: NodeType, x: number, y: number) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Configure ${type.toUpperCase()}</h3>
        <input type="text" id="val" placeholder="Description (e.g. Abandoned users)">
        <button id="add">Apply Changes</button>
      </div>`;
    this.shadowRoot?.appendChild(modal);

    modal.querySelector('#add')?.addEventListener('click', () => {
      const text = (modal.querySelector('#val') as HTMLInputElement).value || type;
      const id = `node-${Date.now()}`;

      // Branching logic: Connect to last split if available, otherwise sequential
      let parentId = this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].id : null;
      if (this.lastSplitId && (type === 'action' || type === 'end')) parentId = this.lastSplitId;

      const newNode = { id, type, x, y, text, parentId };
      this.nodes.push(newNode);
      if (type === 'split') this.lastSplitId = id;

      this.engine.addNode({ id, type, params: { segmentName: text }, position: { x, y } });
      if (parentId) this.engine.addEdge(parentId, id);

      this.renderNodeOnCanvas(id, type, x, y, text);
      this.updateEdges();
      modal.remove();
    });
  }

  private renderNodeOnCanvas(id: string, type: string, x: number, y: number, text: string) {
    const canvas = this.shadowRoot?.querySelector('#canvas');
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${x}, ${y})`);
    g.setAttribute("class", "node-group");
    g.setAttribute("data-id", id);

    if (type === 'wait' || type === 'end') {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("r", "45");
      circle.setAttribute("fill", type === 'wait' ? "#f3f4f6" : "#fee2e2");
      circle.setAttribute("stroke", "#9ca3af");
      g.appendChild(circle);

      const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
      lbl.setAttribute("text-anchor", "middle"); lbl.setAttribute("dy", "5");
      lbl.style.fontSize = "11px"; lbl.textContent = text;
      g.appendChild(lbl);
    } else {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "220"); rect.setAttribute("height", "90");
      rect.setAttribute("rx", "10"); rect.setAttribute("fill", this.getColor(type));
      rect.setAttribute("stroke", "#d1d5db");
      g.appendChild(rect);

      const h = document.createElementNS("http://www.w3.org/2000/svg", "text");
      h.setAttribute("x", "15"); h.setAttribute("y", "25");
      h.style.fontSize = "10px"; h.style.fill = "#9ca3af"; h.textContent = type.toUpperCase();
      g.appendChild(h);

      const b = document.createElementNS("http://www.w3.org/2000/svg", "text");
      b.setAttribute("x", "15"); b.setAttribute("y", "55");
      b.style.fontSize = "13px"; b.style.fontWeight = "500"; b.textContent = text;
      g.appendChild(b);
    }
    canvas?.appendChild(g);
  }

  private getColor(type: string) {
    const palette: any = { audience: '#eff6ff', filter: '#fff7ed', split: '#f0fdf4', action: '#fefce8' };
    return palette[type] || '#ffffff';
  }

  private updateEdges() {
    const canvas = this.shadowRoot?.querySelector('#canvas');
    canvas?.querySelectorAll('.edge-path').forEach(el => el.remove());
    this.nodes.forEach(n => {
      if (n.parentId) {
        const p = this.nodes.find(node => node.id === n.parentId);
        if (p) this.drawManhattanEdge(p, n);
      }
    });
  }

  private drawManhattanEdge(n1: any, n2: any) {
    const canvas = this.shadowRoot?.querySelector('#canvas');
    const start = { x: n1.x + 110, y: n1.y + (n1.type === 'wait' || n1.type === 'end' ? 45 : 90) };
    const end = { x: n2.x + 110, y: n2.y - (n2.type === 'wait' || n2.type === 'end' ? 45 : 0) };
    const midY = start.y + 30; // T-Branch height

    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", `M ${start.x} ${start.y} L ${start.x} ${midY} L ${end.x} ${midY} L ${end.x} ${end.y}`);
    p.setAttribute("class", "edge-path");
    p.setAttribute("stroke", "#9ca3af"); p.setAttribute("fill", "none"); p.setAttribute("stroke-width", "2");
    canvas?.prepend(p);
  }

  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
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
      </div>`;
    this.setupListeners();
  }
}
customElements.define('c1x-workflow-builder', C1XWorkflowBuilder);