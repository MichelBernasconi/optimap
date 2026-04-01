import * as vscode from 'vscode';
import * as path from 'path';
import { getFullAnalysis } from './analyzer';

export class OptiMapProvider {
    public static readonly viewType = 'optimap.view';
    private _panel: vscode.WebviewPanel | undefined;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public async show() {
        if (this._panel) {
            this._panel.reveal(vscode.ViewColumn.One);
            return;
        }

        this._panel = vscode.window.createWebviewPanel(
            OptiMapProvider.viewType,
            'OptiMap - Visual Analysis',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [this._extensionUri]
            }
        );

        this._panel.onDidDispose(() => {
            this._panel = undefined;
        });

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.type) {
                case 'applyFix':
                    const opt = message.optimization;
                    if (opt.fix.action === 'add_link') {
                        const target = opt.fix.target;
                        const content = opt.fix.content;
                        if (target && content) {
                            // Simple append for demonstration
                            const fs = require('fs');
                            fs.appendFileSync(target, `\n\n${content}\n`);
                            vscode.window.showInformationMessage(`Applied shortcut link to ${path.basename(target)}`);
                        }
                    } else if (opt.fix.action === 'delegate_to_ai') {
                        vscode.window.showInformationMessage(`Requesting AI agent to optimize: ${opt.description}`);
                        // In a real scenario, this would trigger an agent prompt
                    }
                    // Refresh view
                    await this.show();
                    break;
            }
        });

        // Load content
        this._panel.webview.html = await this._getHtmlForWebview(this._panel.webview);

        // Initial Data Push
        const analysis = await getFullAnalysis();
        
        this._panel.webview.postMessage({
            type: 'init',
            graph: analysis.graph,
            trace: analysis.trace,
            optimizations: analysis.optimizations
        });
    }

    private async _getHtmlForWebview(webview: vscode.Webview): Promise<string> {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>OptiMap</title>
                <script src="https://d3js.org/d3.v7.min.js"></script>
                <style>
                    body { margin: 0; display: flex; flex-direction: row; height: 100vh; overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #1a1a1a; color: #fff; }
                    #main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
                    #canvas { flex: 1; position: relative; }
                    #sidebar { width: 300px; background: #252526; border-left: 1px solid #333; overflow-y: auto; padding: 16px; }
                    #controls { padding: 16px; background: rgba(30,30,30,0.9); border-top: 1px solid #333; display: flex; gap: 12px; align-items: center; }
                    .node { cursor: pointer; stroke-width: 2px; }
                    .edge { stroke: #555; stroke-opacity: 0.6; pointer-events: none; }
                    .node-label { font-size: 11px; font-weight: 500; pointer-events: none; }
                    button { background: #007acc; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; }
                    #timeline { flex: 1; accent-color: #007acc; }
                    .opt-card { background: #333; padding: 12px; border-radius: 6px; margin-bottom: 12px; border-left: 4px solid #007acc; }
                    .opt-card.cycle { border-left-color: #ff5555; }
                    .opt-title { font-weight: bold; font-size: 13px; margin-bottom: 4px; display: block; }
                    .opt-desc { font-size: 11px; opacity: 0.8; }
                    .opt-metrics { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; font-size: 10px; font-weight: bold; color: #00ffcc; }
                    .node.cycle { fill: #ff5555 !important; }
                    .node.redundancy { fill: #ffcc00 !important; }
                    .node.active { fill: #00ffcc !important; stroke: #fff !important; stroke-width: 3px !important; }
                </style>
            </head>
            <body>
                <div id="main">
                    <div id="canvas"></div>
                    <div id="controls">
                        <button id="prevBtn">Prev</button>
                        <button id="nextBtn">Next</button>
                        <input type="range" id="timeline" min="0" max="0" value="0">
                        <span id="stepCounter">Step: 0/0</span>
                    </div>
                </div>
                <div id="sidebar">
                    <h3>Optimization Tips</h3>
                    <div id="optList">No issues found!</div>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    let graphData, traceSteps, optimizations;
                    let currentStepIndex = 0;

                    window.addEventListener('message', event => {
                        const m = event.data;
                        if (m.type === 'init') {
                            graphData = m.graph;
                            traceSteps = m.trace;
                            optimizations = m.optimizations;
                            renderGraph();
                            renderOptimizations();
                            updateTimeline();
                        }
                    });

                    function renderOptimizations() {
                        const list = document.getElementById('optList');
                        if (!optimizations || optimizations.length === 0) {
                            list.innerHTML = "No issues found!";
                            return;
                        }
                        list.innerHTML = optimizations.map(opt => \`
                            <div class="opt-card \${opt.type}">
                                <span class="opt-title">\${opt.title}</span>
                                <span class="opt-desc">\${opt.description}</span>
                                \${opt.estimatedSavings ? \`
                                    <div class="opt-metrics">
                                        <span>🚀 Speed: +\${opt.estimatedSavings.speed}%</span>
                                        <span>💎 Tokens: -\${opt.estimatedSavings.tokens}%</span>
                                    </div>
                                \` : ''}
                                \${opt.fix ? \`<button style="margin-top:8px; width:100%" onclick="applyFix('\${opt.id}')">Apply Fix</button>\` : ''}
                            </div>
                        \`).join('');
                    }

                    window.applyFix = (optId) => {
                        const opt = optimizations.find(o => o.id === optId);
                        if (opt) {
                            vscode.postMessage({ type: 'applyFix', optimization: opt });
                        }
                    };

                    function renderGraph() {
                        const width = document.getElementById('canvas').clientWidth;
                        const height = document.getElementById('canvas').clientHeight;
                        document.getElementById('canvas').innerHTML = ''; // Clean
                        
                        const svg = d3.select("#canvas").append("svg")
                            .attr("width", width)
                            .attr("height", height)
                            .call(d3.zoom().on("zoom", (e) => { container.attr("transform", e.transform); }));
                        
                        const container = svg.append("g");
                        const simulation = d3.forceSimulation(graphData.nodes)
                            .force("link", d3.forceLink(graphData.edges).id(d => d.id).distance(80))
                            .force("charge", d3.forceManyBody().strength(-200))
                            .force("center", d3.forceCenter(width / 2, height / 2));

                        const links = container.append("g").selectAll("line").data(graphData.edges).enter().append("line").attr("class", "edge");

                        const nodes = container.append("g").selectAll("circle")
                            .data(graphData.nodes).enter().append("circle")
                            .attr("r", 7).attr("fill", "#007acc").attr("class", d => {
                                let cls = "node";
                                optimizations.forEach(o => {
                                    if (o.affectedNodes.includes(d.id)) cls += " " + o.type;
                                });
                                return cls;
                            })
                            .call(d3.drag().on("start", (e,d) => {
                                if (!e.active) simulation.alphaTarget(0.3).restart();
                                d.fx = d.x; d.fy = d.y;
                            }).on("drag", (e,d) => {
                                d.fx = e.x; d.fy = e.y;
                            }).on("end", (e,d) => {
                                if (!e.active) simulation.alphaTarget(0);
                                d.fx = null; d.fy = null;
                            }));

                        const labels = container.append("g").selectAll("text").data(graphData.nodes).enter().append("text")
                            .text(d => d.label).attr("class", "node-label").attr("dx", 10).attr("dy", 3).attr("fill", "#ccc");

                        simulation.on("tick", () => {
                            links.attr("x1", d=>d.source.x).attr("y1", d=>d.source.y).attr("x2", d=>d.target.x).attr("y2", d=>d.target.y);
                            nodes.attr("cx", d=>d.x).attr("cy", d=>d.y);
                            labels.attr("x", d=>d.x).attr("y", d=>d.y);
                        });
                    }

                    function updateTimeline() {
                        const slider = document.getElementById('timeline');
                        slider.max = traceSteps.length > 0 ? traceSteps.length - 1 : 0;
                        document.getElementById('stepCounter').innerText = "Step: 0/" + traceSteps.length;
                    }

                    document.getElementById('nextBtn').addEventListener('click', () => { if (currentStepIndex < traceSteps.length - 1) { currentStepIndex++; applyStep(currentStepIndex); } });
                    document.getElementById('prevBtn').addEventListener('click', () => { if (currentStepIndex > 0) { currentStepIndex--; applyStep(currentStepIndex); } });
                    document.getElementById('timeline').addEventListener('input', (e) => { currentStepIndex = parseInt(e.target.value); applyStep(currentStepIndex); });

                    function applyStep(index) {
                        if (traceSteps.length === 0) return;
                        const step = traceSteps[index];
                        document.getElementById('timeline').value = index;
                        document.getElementById('stepCounter').innerText = "Step: " + (index+1) + "/" + traceSteps.length;
                        d3.selectAll('.node').classed('active', d => d.id === step.nodeId);
                    }
                </script>
            </body>
            </html>
        `;
    }
}
