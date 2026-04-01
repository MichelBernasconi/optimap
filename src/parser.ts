import * as fs from 'fs';
import * as path from 'path';

export interface GraphNode {
    id: string; // The file path or a unique ID based on the file name
    label: string; // Meaningful name (e.g. from frontmatter or filename)
    fullPath: string;
}

export interface GraphEdge {
    source: string;
    target: string;
    type: 'link' | 'reference';
}

export interface GraphData {
    nodes: GraphNode[];
    edges: GraphEdge[];
}

/**
 * Parses a single Markdown file to find outgoing links to other .md files.
 */
export function parseMarkdownLinks(filePath: string): string[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const links: string[] = [];

    // Regex for [text](link.md)
    // Matches relative paths ending in .md
    const markdownLinkRegex = /\[(?:[^\]]*)\]\(([^)]+\.md)\)/g;
    
    let match;
    while ((match = markdownLinkRegex.exec(content)) !== null) {
        const linkedPath = match[1];
        // Resolve path relative to current file
        const resolvedPath = path.resolve(path.dirname(filePath), linkedPath);
        links.push(resolvedPath);
    }

    return Array.from(new Set(links)); // Unique links only
}

/**
 * Extracts a display label from a Markdown file's frontmatter or # Title.
 */
export function extractLabel(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Check for title: in frontmatter
    const titleRegex = /^title:\s*(.*)$/m;
    const match = titleRegex.exec(content);
    if (match && match[1]) {
        return match[1].replace(/['"]/g, '').trim();
    }

    // Check for # Title
    const h1Regex = /^#\s+(.*)$/m;
    const h1Match = h1Regex.exec(content);
    if (h1Match && h1Match[1]) {
        return h1Match[1].trim();
    }

    return path.basename(filePath, '.md');
}

/**
 * Structure of a single step in an agent's path.
 */
export interface TraceStep {
    timestamp: string; // ISO or relative
    nodeId: string;
    action: string;
}

/**
 * Parses an Antigravity overview.txt or similar log file.
 * Looking for: tool call: view_file { AbsolutePath: "..." }
 */
export async function parseLogFile(logPath: string): Promise<TraceStep[]> {
    if (!fs.existsSync(logPath)) return [];
    
    const content = fs.readFileSync(logPath, 'utf-8');
    const lines = content.split('\n');
    const trace: TraceStep[] = [];

    // Generalized regex for view_file calls with a path
    // Matches: tool call: view_file { "AbsolutePath": "C:\\path\\to\\file.md" }
    const viewFileRegex = /view_file.*["']AbsolutePath["']:\s*["']([^"']+\.md)["']/i;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = viewFileRegex.exec(line);
        if (match && match[1]) {
            const filePath = path.resolve(match[1]); // Normalize
            trace.push({
                timestamp: `Step ${trace.length + 1}`,
                nodeId: filePath,
                action: 'view_file'
            });
        }
    }

    return trace;
}
