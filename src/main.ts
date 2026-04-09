import { WorkflowEngine } from './engine';
import { NodeType, NodeParams } from './types';

class C1XWorkflowBuilder extends HTMLElement {
  private engine = new WorkflowEngine();
  private dragNode: SVGGElement | null = null;
  private selectedNodeId: string | null = null;
  private offset = { x: 0, y: 0 };
  private nodes: any[] = [];
  private lastSplitId: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  private onKeyDown(e: KeyboardEvent) {
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedNodeId) {
      this.engine.deleteNode(this.selectedNodeId);
      this.selectedNodeId = null;
      this.refreshCanvas();
    }
  }

  private setupListeners() {
    const canvas = this.shadowRoot?.querySelector('#canvas') as SVGSVGElement;

    canvas?.addEventListener('mousedown', (e) => {
      const target = (e.target as HTMLElement).closest('g.node-group');
      if (target) {
        this.dragNode = target as unknown as SVGGElement;
        this.selectedNodeId = this.dragNode.getAttribute('data-id');
        canvas.querySelectorAll('g.node-group').forEach(g => g.classList.remove('selected'));
        this.dragNode.classList.add('selected');
        const m = this.dragNode.getCTM()!;
        this.offset.x = e.clientX - m.e;
        this.offset.y = e.clientY - m.f;
      } else {
        this.selectedNodeId = null;
        canvas.querySelectorAll('g.node-group').forEach(g => g.classList.remove('selected'));
      }
    });

    canvas?.addEventListener('click', (e) => {
      const trash = (e.target as HTMLElement).closest('.trash-btn');
      if (trash) {
        const nId = trash.getAttribute('data-node-id');
        const eSrc = trash.getAttribute('data-edge-source');
        const eTrg = trash.getAttribute('data-edge-target');
        if (nId) this.engine.deleteNode(nId);
        else if (eSrc && eTrg) this.engine.deleteEdge(eSrc, eTrg);
        this.refreshCanvas();
      }
    });

    canvas?.addEventListener('mousemove', (e) => {
      if (this.dragNode) {
        const x = e.clientX - this.offset.x;
        const y = e.clientY - this.offset.y;
        this.dragNode.setAttribute("transform", `translate(${x}, ${y})`);
        const node = this.nodes.find(n => n.id === this.dragNode!.getAttribute('data-id'));
        if (node) { node.x = x; node.y = y; }
        this.updateEdges();
      }
    });

    window.addEventListener('mouseup', () => { this.dragNode = null; });

    this.shadowRoot?.querySelectorAll('.node-palette-item').forEach(item => {
      item.addEventListener('dragstart', (e: any) => e.dataTransfer.setData('type', e.target.dataset.type));
    });

    canvas?.addEventListener('dragover', (e) => e.preventDefault());
    canvas?.addEventListener('drop', (e: any) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      this.openConfigModal(e.dataTransfer.getData('type') as NodeType, e.clientX - rect.left, e.clientY - rect.top);
    });

    this.shadowRoot?.querySelector('#undo-btn')?.addEventListener('click', () => { if (this.engine.undo()) this.refreshCanvas(); });
    this.shadowRoot?.querySelector('#redo-btn')?.addEventListener('click', () => { if (this.engine.redo()) this.refreshCanvas(); });

    this.shadowRoot?.querySelector('#export-btn')?.addEventListener('click', () => {
      const data = this.engine.exportJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workflow-${Date.now()}.json`;
      // Fix: Append to body for certain browsers
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  }

  private refreshCanvas() {
    const canvas = this.shadowRoot?.querySelector('#canvas');
    if (canvas) {
      const defs = canvas.querySelector('defs');
      canvas.innerHTML = '';
      if (defs) canvas.appendChild(defs);
    }
    const engineNodes = this.engine.getNodes();
    const engineEdges = this.engine.getEdges();
    this.nodes = engineNodes.map(n => ({
      id: n.id, type: n.type, x: n.position.x, y: n.position.y,
      text: n.params.segmentName,
      parentId: engineEdges.find(e => e.target === n.id)?.source || null
    }));
    this.nodes.forEach(n => this.renderNodeOnCanvas(n.id, n.type, n.x, n.y, n.text));
    this.updateEdges();
  }

  private openConfigModal(type: NodeType, x: number, y: number) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';

    let html = '';
    switch (type) {
      case 'audience': html = `<input type="text" id="p1" placeholder="Segment Name">`; break;
      case 'wait': html = `<input type="number" id="p1" placeholder="Duration"><select id="p2"><option value="Minutes">Minutes</option><option value="Hours">Hours</option><option value="Days">Days</option></select>`; break;
      case 'filter': html = `<select id="p1"><option value="Opened Email">Opened Email</option><option value="Purchased">Purchased</option></select><input type="text" id="p2" placeholder="Value (True/False)">`; break;
      case 'action': html = `<select id="p1"><option value="Email">Email</option><option value="SMS">SMS</option><option value="WhatsApp">WhatsApp</option></select><input type="text" id="p2" placeholder="Template ID">`; break;
      default: html = `<input type="text" id="p1" placeholder="Label">`;
    }

    modal.innerHTML = `<div class="modal-content"><h3>${type.toUpperCase()}</h3>${html}<button id="save">Save</button></div>`;
    this.shadowRoot?.appendChild(modal);

    modal.querySelector('#save')?.addEventListener('click', () => {
      const v1 = (modal.querySelector('#p1') as any).value;
      const v2 = (modal.querySelector('#p2') as any)?.value;
      const params: NodeParams = {};

      if (type === 'audience') params.segmentName = v1;
      else if (type === 'wait') { params.duration = Number(v1); params.unit = v2; params.segmentName = `Wait ${v1} ${v2}`; }
      else if (type === 'filter') { params.condition = v1; params.value = v2; params.segmentName = `${v1}: ${v2}`; }
      else if (type === 'action') { params.channel = v1; params.templateId = v2; params.segmentName = `Send ${v1}`; }
      else params.segmentName = v1;

      const id = `node-${Date.now()}`;
      let pId = this.nodes.length > 0 ? this.nodes[this.nodes.length - 1].id : null;
      if (this.lastSplitId && (type === 'action' || type === 'end')) pId = this.lastSplitId;
      if (type === 'split') this.lastSplitId = id;

      this.engine.addNode({ id, type, params, position: { x, y } });
      if (pId) this.engine.addEdge(pId, id);
      this.refreshCanvas();
      modal.remove();
    });
  }

  private renderNodeOnCanvas(id: string, type: string, x: number, y: number, text: string) {
    const canvas = this.shadowRoot?.querySelector('#canvas');
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("transform", `translate(${x}, ${y})`);
    g.setAttribute("class", "node-group");
    g.setAttribute("data-id", id);
    if (id === this.selectedNodeId) g.classList.add('selected');

    if (type === 'wait' || type === 'end') {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("r", "45"); c.setAttribute("fill", type === 'wait' ? "#f3f4f6" : "#fee2e2"); c.setAttribute("stroke", "#9ca3af");
      g.appendChild(c);
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("text-anchor", "middle"); t.setAttribute("dy", "5"); t.style.fontSize = "11px"; t.textContent = text;
      g.appendChild(t);
    } else {
      const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      r.setAttribute("width", "220"); r.setAttribute("height", "90"); r.setAttribute("rx", "10"); r.setAttribute("fill", this.getColor(type)); r.setAttribute("stroke", "#d1d5db");
      g.appendChild(r);
      const h = document.createElementNS("http://www.w3.org/2000/svg", "text");
      h.setAttribute("x", "15"); h.setAttribute("y", "25"); h.style.fontSize = "10px"; h.style.fill = "#9ca3af"; h.textContent = type.toUpperCase();
      g.appendChild(h);
      const b = document.createElementNS("http://www.w3.org/2000/svg", "text");
      b.setAttribute("x", "15"); b.setAttribute("y", "55"); b.style.fontSize = "13px"; b.style.fontWeight = "500"; b.textContent = text;
      g.appendChild(b);
    }
    const trash = this.createTrashIcon(type === 'wait' || type === 'end' ? 35 : 210, type === 'wait' || type === 'end' ? -35 : -10);
    trash.setAttribute('data-node-id', id);
    g.appendChild(trash);
    canvas?.appendChild(g);
  }

  private createTrashIcon(x: number, y: number) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "trash-btn"); g.setAttribute("transform", `translate(${x}, ${y})`);
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", "12"); c.setAttribute("fill", "#ef4444");
    g.appendChild(c);
    const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l1.setAttribute("x1", "-5"); l1.setAttribute("y1", "-5"); l1.setAttribute("x2", "5"); l1.setAttribute("y2", "5"); l1.setAttribute("stroke", "white"); l1.setAttribute("stroke-width", "2");
    g.appendChild(l1);
    const l2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
    l2.setAttribute("x1", "5"); l2.setAttribute("y1", "-5"); l2.setAttribute("x2", "-5"); l2.setAttribute("y2", "5"); l2.setAttribute("stroke", "white"); l2.setAttribute("stroke-width", "2");
    g.appendChild(l2);
    return g;
  }

  private getColor(type: string) {
    const p: any = { audience: '#eff6ff', filter: '#fff7ed', split: '#f0fdf4', action: '#fefce8' };
    return p[type] || '#ffffff';
  }

  private updateEdges() {
    const canvas = this.shadowRoot?.querySelector('#canvas');
    canvas?.querySelectorAll('.edge-container').forEach(el => el.remove());
    this.nodes.forEach(n => {
      if (n.parentId) {
        const p = this.nodes.find(node => node.id === n.parentId);
        if (p) this.drawManhattanEdge(p, n);
      }
    });
  }

  private drawManhattanEdge(n1: any, n2: any) {
    const canvas = this.shadowRoot?.querySelector('#canvas');
    const sX = (n1.type === 'wait' || n1.type === 'end') ? n1.x : n1.x + 110;
    const sY = (n1.type === 'wait' || n1.type === 'end') ? n1.y + 45 : n1.y + 90;
    const eX = (n2.type === 'wait' || n2.type === 'end') ? n2.x : n2.x + 110;
    const eY = (n2.type === 'wait' || n2.type === 'end') ? n2.y - 45 : n2.y;
    const midY = sY + 30;
    const container = document.createElementNS("http://www.w3.org/2000/svg", "g");
    container.setAttribute("class", "edge-container");
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", `M ${sX} ${sY} L ${sX} ${midY} L ${eX} ${midY} L ${eX} ${eY}`);
    p.setAttribute("class", "edge-path");
    p.setAttribute("stroke", "#9ca3af"); p.setAttribute("fill", "none"); p.setAttribute("stroke-width", "2");
    p.setAttribute("marker-end", "url(#arrowhead)");
    container.appendChild(p);
    const trash = this.createTrashIcon((sX + eX) / 2, midY);
    trash.setAttribute('data-edge-source', n1.id); trash.setAttribute('data-edge-target', n2.id);
    container.appendChild(trash);
    canvas?.prepend(container);
  }

  render() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { --primary: #4f46e5; font-family: 'Inter', sans-serif; }
        .workflow-container { display: flex; height: 100vh; overflow: hidden; background: #fff; }
        .sidebar { width: 140px; padding: 20px; background: #f9fafb; border-right: 1px solid #e5e7eb; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .node-palette-item { width: 90px; padding: 12px 0; text-align: center; border: 1px solid #d1d5db; cursor: grab; font-size: 12px; background: white; font-weight: 500; border-radius: 8px; }
        .item-audience { background: #eff6ff; } .item-filter { background: #fff7ed; } .item-split { background: #f0fdf4; } .item-action { background: #fefce8; } .item-wait, .item-end { border-radius: 50%; width: 60px; }
        .canvas-area { flex-grow: 1; position: relative; overflow: auto; background-image: radial-gradient(#e5e7eb 1.2px, transparent 1.2px); background-size: 24px 24px; }
        #canvas { min-width: 4000px; min-height: 4000px; outline: none; }
        .trash-btn { opacity: 0; cursor: pointer; transition: opacity 0.2s; }
        .node-group:hover .trash-btn, .edge-container:hover .trash-btn { opacity: 1; }
        .node-group.selected circle, .node-group.selected rect { stroke: var(--primary) !important; stroke-width: 3px !important; }
        .toolbar { position: absolute; top: 20px; right: 40px; display: flex; gap: 10px; z-index: 10; }
        .btn { background: var(--primary); color: white; border: none; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-weight: 600; }
        .btn-secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { background: white; padding: 30px; border-radius: 16px; width: 320px; }
        input, select { width: 100%; padding: 12px; margin: 10px 0; border: 1px solid #d1d5db; border-radius: 8px; box-sizing: border-box; }
      </style>
      <div class="workflow-container">
        <aside class="sidebar">
          <div class="node-palette-item item-audience" draggable="true" data-type="audience">Audience</div>
          <div class="node-palette-item item-filter" draggable="true" data-type="filter">Filter</div>
          <div class="node-palette-item item-split" draggable="true" data-type="split">Split</div>
          <div class="node-palette-item item-action" draggable="true" data-type="action">Action</div>
          <div class="node-palette-item item-wait" draggable="true" data-type="wait">Wait</div>
          <div class="node-palette-item item-end" draggable="true" data-type="end">End</div>
        </aside>
        <main class="canvas-area">
          <div class="toolbar">
            <button id="undo-btn" class="btn btn-secondary">Undo</button>
            <button id="redo-btn" class="btn btn-secondary">Redo</button>
            <button id="export-btn" class="btn">Export JSON</button>
          </div>
          <svg id="canvas" width="4000" height="4000" tabindex="0">
            <defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" /></marker></defs>
          </svg>
        </main>
      </div>`;
    this.setupListeners();
  }
}
customElements.define('c1x-workflow-builder', C1XWorkflowBuilder);