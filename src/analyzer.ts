import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import { 
    GraphData, 
    GraphNode, 
    GraphEdge, 
    parseMarkdownLinks, 
    extractLabel, 
    TraceStep, 
    parseLogFile 
} from './parser';
import { scanWorkflows } from './scanner';
import { detectCycles, findTraceRedundancies, OptimizationResult } from './optimizer';

export interface AnalysisSummary {
    graph: GraphData;
    trace: TraceStep[];
    optimizations: OptimizationResult[];
}

/**
 * Builds a full analysis summary.
 */
export async function getFullAnalysis(): Promise<AnalysisSummary> {
    const graph = await buildGraph();
    const trace = await getAgentTrace();
    
    // Perform optimizations
    const cycles = detectCycles(graph);
    const redundancies = findTraceRedundancies(trace);
    
    const optimizations: OptimizationResult[] = [...redundancies];
    
    cycles.forEach((cycle, index) => {
        optimizations.push({
            id: `cycle-\${index}`,
            type: 'cycle',
            title: 'Circular Reference Detected',
            description: `Found a potential infinite loop involving: \${cycle.map(id => path.basename(id)).join(' -> ')}`,
            affectedNodes: cycle,
            estimatedSavings: { tokens: 90, speed: 95 },
            fix: { action: 'break_loop', target: cycle[0] }
        });
    });

    return { graph, trace, optimizations };
}

/**
 * Builds a graph representation of the workflow network.
 */
export async function buildGraph(): Promise<GraphData> {
    const files = await scanWorkflows();
    
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Map of fullPath -> Node (for fast edge lookup)
    const nodeMap = new Map<string, GraphNode>();

    // 1. Create nodes
    for (const fileUri of files) {
        const fullPath = fileUri.fsPath;
        const id = fullPath;
        const label = extractLabel(fullPath);
        
        const node: GraphNode = { id, label, fullPath };
        nodes.push(node);
        nodeMap.set(fullPath, node);
    }

    // 2. Create edges
    for (const node of nodes) {
        const outgoingLinks = parseMarkdownLinks(node.fullPath);
        for (const targetPath of outgoingLinks) {
            // Find target node in our workspace
            const targetNode = nodeMap.get(targetPath);
            if (targetNode) {
                edges.push({
                    source: node.id,
                    target: targetNode.id,
                    type: 'link'
                });
            }
        }
    }

    return { nodes, edges };
}

/**
 * Retrieves the agent trace, either from a mock file or a real log.
 */
export async function getAgentTrace(): Promise<TraceStep[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return [];

    // Try to find a trace.log or overview.txt in the workspace for testing
    const possibleLogPaths = [
        path.join(workspaceFolders[0].uri.fsPath, 'trace.log'),
        path.join(workspaceFolders[0].uri.fsPath, 'overview.txt')
    ];

    for (const logPath of possibleLogPaths) {
        if (fs.existsSync(logPath)) {
            return await parseLogFile(logPath);
        }
    }

    // Default mock data for presentation if no log is found
    return [];
}
