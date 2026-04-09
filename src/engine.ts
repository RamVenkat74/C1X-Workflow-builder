import { Node, Edge, WorkflowData } from './types';

export class WorkflowEngine {
    private nodes: Node[] = [];
    private edges: Edge[] = [];
    private history: string[] = [];
    private redoStack: string[] = [];

    constructor() { this.saveState(); }

    private saveState() {
        const state = JSON.stringify({ nodes: this.nodes, edges: this.edges });
        if (this.history.length === 0 || this.history[this.history.length - 1] !== state) {
            this.history.push(state);
            this.redoStack = [];
        }
    }

    public undo(): boolean {
        if (this.history.length <= 1) return false;
        const current = this.history.pop()!;
        this.redoStack.push(current);
        const previous = JSON.parse(this.history[this.history.length - 1]);
        this.nodes = previous.nodes;
        this.edges = previous.edges;
        return true;
    }

    public redo(): boolean {
        if (this.redoStack.length === 0) return false;
        const next = this.redoStack.pop()!;
        this.history.push(next);
        const parsed = JSON.parse(next);
        this.nodes = parsed.nodes;
        this.edges = parsed.edges;
        return true;
    }

    public deleteNode(nodeId: string) {
        this.nodes = this.nodes.filter(n => n.id !== nodeId);
        this.edges = this.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
        this.saveState();
    }

    public deleteEdge(sourceId: string, targetId: string) {
        this.edges = this.edges.filter(e => !(e.source === sourceId && e.target === targetId));
        this.saveState();
    }

    public addNode(node: Node) {
        this.nodes.push(node);
        this.saveState();
    }

    public addEdge(source: string, target: string): boolean {
        if (this.isCircular(source, target)) return false;
        this.edges.push({ source, target });
        this.saveState();
        return true;
    }

    private isCircular(source: string, target: string): boolean {
        const stack = [target];
        while (stack.length > 0) {
            const curr = stack.pop()!;
            if (curr === source) return true;
            this.edges.filter(e => e.source === curr).forEach(e => stack.push(e.target));
        }
        return false;
    }

    public getNodes() { return [...this.nodes]; }
    public getEdges() { return [...this.edges]; }

    public exportJSON(): WorkflowData {
        return {
            workflowId: `wf-${Date.now()}`,
            nodes: this.nodes,
            edges: this.edges
        };
    }
}