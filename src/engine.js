export class WorkflowEngine {
    nodes = [];
    edges = [];
    addNode(node) {
        this.nodes.push(node);
    }
    addEdge(source, target) {
        if (this.isCircular(source, target)) {
            alert("Circular dependency detected! Connection blocked.");
            return false;
        }
        this.edges.push({ source, target });
        return true;
    }
    isCircular(source, target) {
        const stack = [target];
        while (stack.length > 0) {
            const curr = stack.pop();
            if (curr === source)
                return true;
            this.edges.filter(e => e.source === curr).forEach(e => stack.push(e.target));
        }
        return false;
    }
    exportJSON() {
        return {
            workflowId: `c1x-camp-${Date.now()}`,
            nodes: this.nodes,
            edges: this.edges
        };
    }
}
