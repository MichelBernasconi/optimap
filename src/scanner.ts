import * as vscode from 'vscode';

/**
 * Scans the workspace for Markdown files relevant to AI workflows.
 */
export async function scanWorkflows(): Promise<vscode.Uri[]> {
    // Specifically search for .md files in common agent directories
    // and generally in the workspace excluding common junk
    const pattern = '**/{.agents,.agent,_agents,_agent}/**/*.md';
    let files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    
    // Fallback for demonstration: if no files in .agents, take all .md in workspace
    if (files.length === 0) {
        files = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
    }

    return files;
}

/**
 * A more broad scan if the specific directories aren't found.
 */
export async function scanAllMarkdown(): Promise<vscode.Uri[]> {
    const files = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
    return files;
}
