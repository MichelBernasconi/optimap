import { GraphData, GraphNode, GraphEdge, TraceStep } from './parser';

export interface OptimizationResult {
    type: 'cycle' | 'redundancy' | 'shortcut';
    id: string; // Unique ID for this optimization instance
    title: string;
    description: string;
    affectedNodes: string[];
    estimatedSavings?: {
        tokens: number; // Percentage (e.g., 15)
        speed: number; // Percentage (e.g., 20)
    };
    fix?: {
        action: 'add_link' | 'break_loop' | 'delegate_to_ai';
        target?: string; // e.g., the file path to edit
        content?: string; // e.g., the suggested link markdown
    };
}

/**
 * Detects circular dependencies in the graph using DFS.
 */
export function detectCycles(graph: GraphData): string[][] {
    const adj = new Map<string, string[]>();
    graph.edges.forEach(e => {
        if (!adj.has(e.source)) adj.set(e.source, []);
        adj.get(e.source)!.push(e.target);
    });

    const cycles: string[][] = [];
    const visited = new Set<string>();
    const stack = new Set<string>();
    const path: string[] = [];

    function dfs(u: string) {
        visited.add(u);
        stack.add(u);
        path.push(u);

        const neighbors = adj.get(u) || [];
        for (const v of neighbors) {
            if (stack.has(v)) {
                // Cycle found
                const cycleStartIndex = path.indexOf(v);
                cycles.push(path.slice(cycleStartIndex));
            } else if (!visited.has(v)) {
                dfs(v);
            }
        }

        stack.delete(u);
        path.pop();
    }

    graph.nodes.forEach(n => {
        if (!visited.has(n.id)) dfs(n.id);
    });

    return cycles;
}

/**
 * Analyzes the trace for redundant visits that don't change state.
 */
export function findTraceRedundancies(trace: TraceStep[]): OptimizationResult[] {
    const redundancies: OptimizationResult[] = [];
    const visitCounts = new Map<string, number>();

    trace.forEach(step => {
        visitCounts.set(step.nodeId, (visitCounts.get(step.nodeId) || 0) + 1);
    });

    visitCounts.forEach((count, nodeId) => {
        if (count > 2) {
            // Saving: (count - 1) steps out of total trace length
            const savedRatio = Math.round(((count - 1) / trace.length) * 100);
            redundancies.push({
                id: `red-\${nodeId}-\${Date.now()}`,
                type: 'redundancy',
                title: 'High Visit Count',
                description: `Agent visited this file \${count} times. Consider merging content or clarifying the path.`,
                affectedNodes: [nodeId],
                estimatedSavings: { tokens: savedRatio, speed: savedRatio + 5 },
                fix: { action: 'delegate_to_ai', target: nodeId }
            });
        }
    });

    return redundancies;
}

/**
 * Suggests shortcut links for frequently traversed paths.
 */
export function suggestShortcuts(trace: TraceStep[]): OptimizationResult[] {
    // Look for A -> B -> C where A could go directly to C
    const potentialShortcuts: OptimizationResult[] = [];
    
    for (let i = 0; i < trace.length - 2; i++) {
        const a = trace[i].nodeId;
        const c = trace[i+2].nodeId;
        
        if (a !== c) {
            // Saving 1 step out of total trace length
            const savedRatio = Math.round((1 / trace.length) * 100);
            potentialShortcuts.push({
                id: `short-\${a}-\${c}-\${i}`,
                type: 'shortcut',
                title: 'Potential Shortcut',
                description: `Agent frequently jumps from A to C via B. Consider adding a direct link.`,
                affectedNodes: [a, c],
                estimatedSavings: { tokens: savedRatio, speed: savedRatio + 2 },
                fix: { 
                    action: 'add_link', 
                    target: a, 
                    content: `[Quick Access to C](\${c})` 
                }
            });
        }
    }

    return potentialShortcuts;
}
