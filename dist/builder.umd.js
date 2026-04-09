(function(c){typeof define=="function"&&define.amd?define(c):c()})(function(){"use strict";var b=Object.defineProperty;var w=(c,p,g)=>p in c?b(c,p,{enumerable:!0,configurable:!0,writable:!0,value:g}):c[p]=g;var f=(c,p,g)=>w(c,typeof p!="symbol"?p+"":p,g);class c{constructor(){f(this,"nodes",[]);f(this,"edges",[])}addNode(h){this.nodes.push(h)}addEdge(h,e){return this.isCircular(h,e)?(alert("Circular dependency detected! Connection blocked."),!1):(this.edges.push({source:h,target:e}),!0)}isCircular(h,e){const d=[e];for(;d.length>0;){const r=d.pop();if(r===h)return!0;this.edges.filter(o=>o.source===r).forEach(o=>d.push(o.target))}return!1}exportJSON(){return{workflowId:`c1x-camp-${Date.now()}`,nodes:this.nodes,edges:this.edges}}}class p extends HTMLElement{constructor(){super();f(this,"engine",new c);f(this,"dragNode",null);f(this,"offset",{x:0,y:0});f(this,"nodes",[]);f(this,"lastSplitId",null);this.attachShadow({mode:"open"})}connectedCallback(){this.render()}setupListeners(){var d,r,o,l;const e=(d=this.shadowRoot)==null?void 0:d.querySelector("#canvas");e==null||e.addEventListener("mousedown",i=>{const t=i.target.closest("g.node-group");if(t){this.dragNode=t;const a=this.dragNode.getCTM();this.offset.x=i.clientX-a.e,this.offset.y=i.clientY-a.f}}),e==null||e.addEventListener("mousemove",i=>{if(this.dragNode){const t=i.clientX-this.offset.x,a=i.clientY-this.offset.y;this.dragNode.setAttribute("transform",`translate(${t}, ${a})`);const n=this.dragNode.getAttribute("data-id"),s=this.nodes.find(u=>u.id===n);s&&(s.x=t,s.y=a),this.updateEdges()}}),window.addEventListener("mouseup",()=>{this.dragNode=null}),(r=this.shadowRoot)==null||r.querySelectorAll(".node-palette-item").forEach(i=>{i.addEventListener("dragstart",t=>t.dataTransfer.setData("type",t.target.dataset.type))}),e==null||e.addEventListener("dragover",i=>i.preventDefault()),e==null||e.addEventListener("drop",i=>{i.preventDefault();const t=e.getBoundingClientRect();this.openConfigModal(i.dataTransfer.getData("type"),i.clientX-t.left,i.clientY-t.top)}),(l=(o=this.shadowRoot)==null?void 0:o.querySelector("#export-btn"))==null||l.addEventListener("click",()=>{const i=this.engine.exportJSON(),t=new Blob([JSON.stringify(i,null,2)],{type:"application/json"}),a=URL.createObjectURL(t),n=document.createElement("a");n.href=a,n.download=`workflow-export-${Date.now()}.json`,n.click(),URL.revokeObjectURL(a)})}openConfigModal(e,d,r){var l,i;const o=document.createElement("div");o.className="modal-overlay",o.innerHTML=`
      <div class="modal-content">
        <h3>Configure ${e.toUpperCase()}</h3>
        <input type="text" id="val" placeholder="Description (e.g. Abandoned users)">
        <button id="add">Apply Changes</button>
      </div>`,(l=this.shadowRoot)==null||l.appendChild(o),(i=o.querySelector("#add"))==null||i.addEventListener("click",()=>{const t=o.querySelector("#val").value||e,a=`node-${Date.now()}`;let n=this.nodes.length>0?this.nodes[this.nodes.length-1].id:null;this.lastSplitId&&(e==="action"||e==="end")&&(n=this.lastSplitId);const s={id:a,type:e,x:d,y:r,text:t,parentId:n};this.nodes.push(s),e==="split"&&(this.lastSplitId=a),this.engine.addNode({id:a,type:e,params:{segmentName:t},position:{x:d,y:r}}),n&&this.engine.addEdge(n,a),this.renderNodeOnCanvas(a,e,d,r,t),this.updateEdges(),o.remove()})}renderNodeOnCanvas(e,d,r,o,l){var a;const i=(a=this.shadowRoot)==null?void 0:a.querySelector("#canvas"),t=document.createElementNS("http://www.w3.org/2000/svg","g");if(t.setAttribute("transform",`translate(${r}, ${o})`),t.setAttribute("class","node-group"),t.setAttribute("data-id",e),d==="wait"||d==="end"){const n=document.createElementNS("http://www.w3.org/2000/svg","circle");n.setAttribute("r","45"),n.setAttribute("fill",d==="wait"?"#f3f4f6":"#fee2e2"),n.setAttribute("stroke","#9ca3af"),t.appendChild(n);const s=document.createElementNS("http://www.w3.org/2000/svg","text");s.setAttribute("text-anchor","middle"),s.setAttribute("dy","5"),s.style.fontSize="11px",s.textContent=l,t.appendChild(s)}else{const n=document.createElementNS("http://www.w3.org/2000/svg","rect");n.setAttribute("width","220"),n.setAttribute("height","90"),n.setAttribute("rx","10"),n.setAttribute("fill",this.getColor(d)),n.setAttribute("stroke","#d1d5db"),t.appendChild(n);const s=document.createElementNS("http://www.w3.org/2000/svg","text");s.setAttribute("x","15"),s.setAttribute("y","25"),s.style.fontSize="10px",s.style.fill="#9ca3af",s.textContent=d.toUpperCase(),t.appendChild(s);const u=document.createElementNS("http://www.w3.org/2000/svg","text");u.setAttribute("x","15"),u.setAttribute("y","55"),u.style.fontSize="13px",u.style.fontWeight="500",u.textContent=l,t.appendChild(u)}i==null||i.appendChild(t)}getColor(e){return{audience:"#eff6ff",filter:"#fff7ed",split:"#f0fdf4",action:"#fefce8"}[e]||"#ffffff"}updateEdges(){var d;const e=(d=this.shadowRoot)==null?void 0:d.querySelector("#canvas");e==null||e.querySelectorAll(".edge-path").forEach(r=>r.remove()),this.nodes.forEach(r=>{if(r.parentId){const o=this.nodes.find(l=>l.id===r.parentId);o&&this.drawManhattanEdge(o,r)}})}drawManhattanEdge(e,d){var a;const r=(a=this.shadowRoot)==null?void 0:a.querySelector("#canvas"),o={x:e.x+110,y:e.y+(e.type==="wait"||e.type==="end"?45:90)},l={x:d.x+110,y:d.y-(d.type==="wait"||d.type==="end"?45:0)},i=o.y+30,t=document.createElementNS("http://www.w3.org/2000/svg","path");t.setAttribute("d",`M ${o.x} ${o.y} L ${o.x} ${i} L ${l.x} ${i} L ${l.x} ${l.y}`),t.setAttribute("class","edge-path"),t.setAttribute("stroke","#9ca3af"),t.setAttribute("fill","none"),t.setAttribute("stroke-width","2"),r==null||r.prepend(t)}render(){this.shadowRoot&&(this.shadowRoot.innerHTML=`
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
      </div>`,this.setupListeners())}}customElements.define("c1x-workflow-builder",p)});
