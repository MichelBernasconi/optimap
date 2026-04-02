import * as vscode from 'vscode';
import * as path from 'path';
import { getFullAnalysis } from './analyzer';

export class OptiMapProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'optimap.view';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public async resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'applyFix':
                    const analysisData = await getFullAnalysis();
                    const opt = analysisData.optimizations.find(o => o.id === message.optimizationId);
                    if (!opt || !opt.fix) return;

                    const fs = require('fs');
                    const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                    const agentsDir = projectRoot ? path.join(projectRoot, 'agents') : null;
                    const hasAgents = agentsDir && fs.existsSync(agentsDir) && fs.readdirSync(agentsDir).length > 0;

                    if (hasAgents) {
                        // Forward fixing task to AI Agent via custom command (Mocked behavior)
                        vscode.window.showInformationMessage(`Forwarding fix request to AI Agent: ${opt.title}`);
                        vscode.commands.executeCommand('optimap.delegateToAgent', {
                            optimization: opt,
                            fix: opt.fix
                        });
                    } else {
                        // Standard manual fix logic
                        if (opt.fix.action === 'add_link') {
                            const target = opt.fix.target;
                            const content = opt.fix.content;
                            if (target && content) {
                                fs.appendFileSync(target, `\n\n${content}\n`);
                                vscode.window.showInformationMessage(`Applied shortcut link to ${path.basename(target)}`);
                            }
                        } else if (opt.fix.action === 'break_loop') {
                            const target = opt.fix.target; 
                            const contentToRemove = opt.fix.content; 
                            if (target && contentToRemove) {
                                const fileContent = fs.readFileSync(target, 'utf8');
                                const regex = new RegExp(`\\[.*\\]\\(.*?${path.basename(contentToRemove)}.*?\\)`, 'g');
                                const newContent = fileContent.replace(regex, '<!-- Link removed to break loop -->');
                                fs.writeFileSync(target, newContent);
                                vscode.window.showInformationMessage(`Broke loop in ${path.basename(target)}`);
                            }
                        }
                    }
                    
                    this.refresh();
                    break;
                case 'scan':
                    this.refresh();
                    break;
                case 'openMap':
                    vscode.commands.executeCommand('optimap.analyze');
                    break;
            }
        });

        this.refresh();
    }

    public async refresh() {
        if (this._view) {
            const analysis = await getFullAnalysis();
            const projectRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            const fs = require('fs');
            const agentsDir = projectRoot ? path.join(projectRoot, 'agents') : null;
            const hasAgents = agentsDir && fs.existsSync(agentsDir) && fs.readdirSync(agentsDir).length > 0;

            this._view.webview.postMessage({
                type: 'init',
                graph: analysis.graph,
                trace: analysis.trace,
                optimizations: analysis.optimizations,
                hasAgents
            });
        }
    }

    private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <style>
                    body { 
                        padding: 0; 
                        color: var(--vscode-foreground); 
                        font-family: var(--vscode-font-family); 
                        font-size: var(--vscode-font-size);
                        background-color: var(--vscode-sideBar-background);
                        overflow-x: hidden;
                    }
                    #graph-container {
                        width: 100%;
                        height: 250px;
                        background: var(--vscode-editor-background);
                        border-bottom: 1px solid var(--vscode-sideBar-border);
                        position: relative;
                        overflow: hidden;
                    }
                    .section { margin-bottom: 10px; }
                    .header { 
                        text-transform: uppercase; 
                        font-size: 10px; 
                        font-weight: bold; 
                        opacity: 0.6; 
                        padding: 8px 12px;
                        background: var(--vscode-sideBarSectionHeader-background);
                        display: flex;
                        justify-content: space-between;
                    }
                    .item { 
                        padding: 4px 16px; 
                        display: flex; 
                        align-items: center; 
                        gap: 8px; 
                        cursor: pointer;
                        font-size: 11px;
                    }
                    .item:hover { background-color: var(--vscode-list-hoverBackground); }
                    .btn-primary { 
                        margin: 10px 12px; 
                        background: var(--vscode-button-background); 
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 4px;
                        width: calc(100% - 24px);
                        border-radius: 2px;
                        cursor: pointer;
                        font-size: 11px;
                    }
                    .opt-card { 
                        background: var(--vscode-list-inactiveSelectionBackground); 
                        margin: 4px 8px; 
                        padding: 8px; 
                        border-radius: 3px;
                        font-size: 10.5px;
                        border-left: 3px solid #007acc;
                        cursor: pointer;
                        transition: transform 0.1s;
                    }
                    .opt-card:hover { transform: translateX(2px); background: var(--vscode-list-hoverBackground); }
                    .opt-card.cycle { border-left-color: #f14c4c; }
                    .opt-title { font-weight: bold; display: block; }
                    .opt-desc { opacity: 0.8; font-size: 9.5px; display: block; margin-top: 2px; }
                    .fix-btn { 
                        margin-top: 6px; 
                        background: var(--vscode-button-secondaryBackground); 
                        border: 1px solid var(--vscode-button-secondaryHoverBackground);
                        color: var(--vscode-button-secondaryForeground); 
                        font-size: 9px; 
                        padding: 2px 8px; 
                        border-radius: 2px;
                        cursor: pointer;
                    }
                    .fix-btn:disabled { opacity: 0.4; cursor: not-allowed; }
                    .node { fill: #007acc; stroke: white; stroke-width: 1px; }
                    .node.issue { fill: #f14c4c; stroke-width: 2px; stroke: #ffcc00; }
                    .link { stroke: #999; stroke-opacity: 0.4; }
                    .link.issue { stroke: #f14c4c; stroke-opacity: 1; stroke-width: 2px; }
                    .label { font-size: 8px; fill: var(--vscode-foreground); pointer-events: none; }
                </style>
                <script src="https://d3js.org/d3.v7.min.js"></script>
            </head>
            <body>
                <div id="graph-container"></div>
                <button class="btn-primary" onclick="scan()">🔄 Scan AI Workflow</button>

                <div class="section">
                    <div class="header">Active Workflow Mapping</div>
                    <div style="padding: 4px 12px; font-size: 9px; opacity: 0.5; display: flex; gap: 10px; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: #007acc;"></div> Normal
                        </div>
                        <div style="display: flex; align-items: center; gap: 4px;">
                            <div style="width: 8px; height: 8px; border-radius: 50%; background: #f14c4c; border: 1px solid #ffcc00;"></div> Optimized/Problem
                        </div>
                    </div>
                    <div style="padding: 4px 12px; font-size: 9px; opacity: 0.5;">
                        Drag to explore. Click card to focus issue.
                    </div>
                </div>

                <div class="section">
                    <div class="header">Optimizations (<span id="optCount">0</span>)</div>
                    <div id="optList"></div>
                </div>

                <div class="section">
                    <div class="header">Search Nodes</div>
                    <div style="padding: 0 8px 8px 8px; display: flex; gap: 4px;">
                        <input type="text" id="nodeSearch" placeholder="Search file name..." style="flex: 1; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); padding: 4px; font-size: 11px; border-radius: 2px;" onkeyup="if(event.key === 'Enter') searchNode()">
                        <button onclick="searchNode()" style="background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 0 8px; font-size: 11px; border-radius: 2px; cursor: pointer;">🔍</button>
                    </div>
                </div>

                <div class="section">
                    <div class="header">Support Project</div>
                    <div style="padding: 8px 12px; text-align: center;">
                        <a href="https://buymeacoffee.com/hoppingdreams" style="color: var(--vscode-textLink-foreground); text-decoration: none; font-size: 11px; display: flex; align-items: center; justify-content: center; gap: 6px;">
                            ☕ Buy me a coffee
                        </a>
                    </div>
                </div>

                <div class="section">
                    <div class="header">Actions</div>
                    <div class="item" onclick="openMap()">📂 Open Full-Screen Interactive Map</div>
                    <div class="item" onclick="scan()">⚡ Force Re-analyze</div>
                </div>

                <script>
                    const vscode = acquireVsCodeApi();
                    let svg, simulation, link, node, label;
                    let lastGraph, lastHasAgents, lastOptimizations;
                    const width = document.body.clientWidth;
                    const height = 250;
                    let zoom;

                    window.addEventListener('message', event => {
                        const m = event.data;
                        if (m.type === 'init') {
                            lastHasAgents = m.hasAgents;
                            lastOptimizations = m.optimizations;
                            document.getElementById('optCount').innerText = m.optimizations.length;
                            renderOptimizations(m.optimizations, m.hasAgents);
                            updateGraph(m.graph, m.optimizations);
                        }
                    });

                    function updateGraph(graph, optimizations) {
                        lastGraph = graph;
                        const container = d3.select("#graph-container");
                        container.selectAll("*").remove();
                        
                        const svgElem = container.append("svg")
                            .attr("viewBox", [0, 0, width, height]);
                        
                        const g = svgElem.append("g");
                        
                        zoom = d3.zoom().on("zoom", (event) => {
                            g.attr("transform", event.transform);
                        });
                        svgElem.call(zoom);

                        const nodes = graph.nodes.map(d => ({...d}));
                        const links = graph.edges.map(d => ({...d}));

                        // Identify issue nodes/links from optimizations (affectedNodes)
                        const issueNodes = new Set();
                        optimizations.forEach(opt => {
                            if (opt.affectedNodes) opt.affectedNodes.forEach(id => issueNodes.add(id));
                        });

                        const simulation = d3.forceSimulation(nodes)
                            .force("link", d3.forceLink(links).id(d => d.id).distance(50))
                            .force("charge", d3.forceManyBody().strength(-100))
                            .force("center", d3.forceCenter(width / 2, height / 2));

                        link = g.append("g")
                            .attr("class", "links")
                            .selectAll("line")
                            .data(links)
                            .join("line")
                            .attr("class", d => issueNodes.has(d.source.id) && issueNodes.has(d.target.id) ? "link issue" : "link")
                            .attr("stroke-width", 1);

                        node = g.append("g")
                            .attr("class", "nodes")
                            .selectAll("circle")
                            .data(nodes)
                            .join("circle")
                            .attr("class", d => issueNodes.has(d.id) ? "node issue" : "node")
                            .attr("r", 5)
                            .call(d3.drag()
                                .on("start", dragstarted)
                                .on("drag", dragged)
                                .on("end", dragended));

                        label = g.append("g")
                            .selectAll("text")
                            .data(nodes)
                            .join("text")
                            .attr("class", "label")
                            .text(d => d.label.substring(0, 10))
                            .attr("dx", 8)
                            .attr("dy", 3);

                        simulation.on("tick", () => {
                            link
                                .attr("x1", d => d.source.x)
                                .attr("y1", d => d.source.y)
                                .attr("x2", d => d.target.x)
                                .attr("y2", d => d.target.y);

                            node
                                .attr("cx", d => d.x)
                                .attr("cy", d => d.y);
                            
                            label
                                .attr("x", d => d.x)
                                .attr("y", d => d.y);
                        });

                        function dragstarted(event) {
                            if (!event.active) simulation.alphaTarget(0.3).restart();
                            event.subject.fx = event.subject.x;
                            event.subject.fy = event.subject.y;
                        }
                        function dragged(event) {
                            event.subject.fx = event.x;
                            event.subject.fy = event.y;
                        }
                        function dragended(event) {
                            if (!event.active) simulation.alphaTarget(0);
                            event.subject.fx = null;
                            event.subject.fy = null;
                        }
                    }

                    function focusIssue(optId) {
                        const opt = lastOptimizations.find(o => o.id === optId);
                        if (!opt || !opt.affectedNodes || opt.affectedNodes.length === 0) return;
                        
                        // Find nodes in current graph
                        const targets = node.data().filter(d => opt.affectedNodes.includes(d.id));
                        if (targets.length === 0) return;

                        const x = d3.mean(targets, d => d.x);
                        const y = d3.mean(targets, d => d.y);
                        
                        const svgElem = d3.select("svg");
                        svgElem.transition().duration(750).call(
                            zoom.transform,
                            d3.zoomIdentity.translate(width / 2, height / 2).scale(2).translate(-x, -y)
                        );
                    }

                    function renderOptimizations(opts, hasAgents) {
                        lastOptimizations = opts;
                        const list = document.getElementById('optList');
                        if (!opts || opts.length === 0) {
                            list.innerHTML = '<div style="padding: 10px 16px; opacity: 0.5; font-size: 11px;">No issues found. Everything is lean!</div>';
                            return;
                        }
                        list.innerHTML = opts.map(opt => \`
                            <div class="opt-card \${opt.type}" onclick="focusIssue('\${opt.id}')">
                                <span class="opt-title">\${opt.title}</span>
                                <span class="opt-desc">\${opt.description}</span>
                                \${opt.fix ? \`<button class="fix-btn" \${!hasAgents ? 'disabled title="Requires AI Agent"' : ''} onclick="event.stopPropagation(); applyFix('\${opt.id}')">Apply Fix \${!hasAgents ? '(No Agent)' : ''}</button>\` : ''}
                            </div>
                        \`).join('');
                    }

                    function searchNode() {
                        const input = document.getElementById('nodeSearch');
                        const query = input.value.toLowerCase().trim();
                        if (!query) return;

                        const target = node.data().find(d => 
                            d.label.toLowerCase().includes(query) || 
                            d.id.toLowerCase().includes(query)
                        );

                        if (target) {
                            const svgElem = d3.select("svg");
                            svgElem.transition().duration(750).call(
                                zoom.transform,
                                d3.zoomIdentity.translate(width / 2, height / 2).scale(2.5).translate(-target.x, -target.y)
                            );
                            input.style.border = "1px solid var(--vscode-button-background)";
                        } else {
                            input.style.border = "1px solid #f14c4c";
                        }
                    }

                    function scan() { vscode.postMessage({ type: 'scan' }); }
                    function openMap() { vscode.postMessage({ type: 'openMap' }); }
                    function applyFix(id) { vscode.postMessage({ type: 'applyFix', optimizationId: id }); }
                </script>
            </body>
            </html>
        `;
    }
}
