/**
 * Scans the workspace for Markdown files relevant to AI workflows.
 * Optimized for both VS Code and standalone Node environments.
 */
export async function scanWorkflows(): Promise<string[]> {
    try {
        const vscode = require('vscode');
        const pattern = '**/{.agents,.agent,_agents,_agent}/**/*.md';
        let files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
        
        if (files.length === 0) {
            files = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
        }
        return files.map((f: any) => f.fsPath);
    } catch (e) {
        // Fallback for standalone Node.js environment (e.g. AI agent bridge)
        const fs = require('fs');
        const path = require('path');
        const results: string[] = [];
        
        function recScan(dir: string) {
            const list = fs.readdirSync(dir);
            for (const file of list) {
                const fullPath = path.resolve(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat && stat.isDirectory()) {
                    if (file !== 'node_modules') recScan(fullPath);
                } else if (file.endsWith('.md')) {
                    results.push(fullPath);
                }
            }
        }
        
        recScan(process.cwd());
        return results;
    }
}

/**
 * A more broad scan if the specific directories aren't found.
 */
export async function scanAllMarkdown(): Promise<string[]> {
    try {
        const vscode = require('vscode');
        const files = await vscode.workspace.findFiles('**/*.md', '**/node_modules/**');
        return files.map((f: any) => f.fsPath);
    } catch (e) {
        return scanWorkflows(); // Use the fallback in scanWorkflows
    }
}
