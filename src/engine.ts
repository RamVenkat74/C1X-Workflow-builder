import { Node, Edge, WorkflowData } from './types';

export class WorkflowEngine {
    private nodes: Node[] = [];
    private edges: Edge[] = [];

    addNode(node: Node) {
        this.nodes.push(node);
    }

    addEdge(source: string, target: string): boolean {
        if (this.isCircular(source, target)) {
            alert("Circular dependency detected! Connection blocked.");
            return false;
        }
        this.edges.push({ source, target });
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

    exportJSON(): WorkflowData {
        return {
            workflowId: `c1x-camp-${Date.now()}`,
            nodes: this.nodes,
            edges: this.edges
        };
    }
}