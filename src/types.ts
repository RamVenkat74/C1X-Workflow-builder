// src/types.ts

export type NodeType = 'audience' | 'filter' | 'wait' | 'action' | 'split' | 'end';

export interface NodeParams {
    segmentName?: string;
    duration?: number;
    unit?: string;
    condition?: string;
    channel?: string;
    templateId?: string;
}

export interface Node {
    id: string;
    type: NodeType;
    params: NodeParams;
    position: { x: number; y: number };
}

export interface Edge {
    source: string;
    target: string;
}

// This is the missing member causing the error
export interface WorkflowData {
    workflowId: string;
    nodes: Node[];
    edges: Edge[];
}