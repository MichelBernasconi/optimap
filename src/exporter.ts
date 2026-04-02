import * as fs from 'fs';
import * as path from 'path';
import { AnalysisSummary } from './analyzer';

export async function exportStaticAnalysis(analysis: AnalysisSummary, workspaceRoot: string) {
    const exportDir = path.join(workspaceRoot, '.optimap_export');
    if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
    }

    // 1. Generate SVG
    const svgPath = path.join(exportDir, 'optimap_graph.svg');
    const svgContent = generateSvg(analysis);
    fs.writeFileSync(svgPath, svgContent);

    // 2. Generate PROJECT_MAP.md
    const mdPath = path.join(exportDir, 'PROJECT_MAP.md');
    const mermaidCode = generateMermaid(analysis);
    const mdContent = `
# OptiMap Project Visualization (Antigravity Mode)

Questa è la rappresentazione grafica reale del tuo progetto, generata automaticamente.

### 📊 Grafo Mermaid (Codice Sorgente)
\`\`\`mermaid
${mermaidCode}
\`\`\`

### 🖼️ Anteprima Statica (SVG)
![Mappa del Progetto](./optimap_graph.svg)

### 📊 Statistiche Analisi
- **Nodi Totali**: ${analysis.graph.nodes.length}
- **Collegamenti**: ${analysis.graph.edges.length}
- **Cicli Rilevati**: ${analysis.optimizations.filter(o => o.type === 'cycle').length}
- **Ottimizzazioni Suggerite**: ${analysis.optimizations.length}

---
*Ultimo aggiornamento: ${new Date().toLocaleString()}*
    `.trim();
    fs.writeFileSync(mdPath, mdContent);

    // 3. Generate interative HTML (for browser)
    const htmlPath = path.join(exportDir, 'optimap_live.html');
    const htmlContent = generateHtml(analysis);
    fs.writeFileSync(htmlPath, htmlContent);

    console.log(`[OptiMap] Static files exported to ${exportDir}`);
}

function generateSvg(analysis: AnalysisSummary): string {
    const nodes = analysis.graph.nodes;
    const edges = analysis.graph.edges;
    
    // Simple layout calculation (grid-like for SVG)
    const width = 800;
    const height = 600;
    const nodeCoords = new Map<string, {x: number, y: number}>();
    
    nodes.forEach((n, i) => {
        const row = Math.floor(i / 3);
        const col = i % 3;
        nodeCoords.set(n.id, { x: 100 + col * 250, y: 100 + row * 150 });
    });

    let svgParts = [
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`,
        `<rect width="100%" height="100%" fill="#1e1e1e" rx="10"/>`,
        `<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#3498db" /></marker></defs>`
    ];

    // Edges
    edges.forEach(e => {
        const s = nodeCoords.get(e.source as string);
        const t = nodeCoords.get(e.target as string);
        if (s && t) {
            svgParts.push(`<line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="#3498db" stroke-width="2" marker-end="url(#arrowhead)" />`);
        }
    });

    // Nodes
    nodes.forEach(n => {
        const coords = nodeCoords.get(n.id);
        if (coords) {
            const isCycle = analysis.optimizations.some(o => o.type === 'cycle' && o.affectedNodes.includes(n.id));
            const color = isCycle ? '#e74c3c' : '#1a3a5a';
            const stroke = isCycle ? '#ff5555' : '#3498db';

            svgParts.push(`
                <g transform="translate(${coords.x - 100},${coords.y - 25})">
                    <rect width="200" height="50" rx="5" fill="${color}" stroke="${stroke}" stroke-width="2"/>
                    <text x="100" y="30" font-family="Arial" font-size="12" fill="white" text-anchor="middle">${n.label}</text>
                </g>
            `);
        }
    });

    svgParts.push(`</svg>`);
    return svgParts.join('\n');
}

function generateMermaid(analysis: AnalysisSummary): string {
    const nodes = analysis.graph.nodes;
    const edges = analysis.graph.edges;
    
    let mermaid = 'graph TD\n';
    
    // Nodes with styling for cycles
    nodes.forEach(n => {
        const isCycle = analysis.optimizations.some(o => o.type === 'cycle' && o.affectedNodes.includes(n.id));
        const cleanLabel = n.label.replace(/"/g, "'");
        const nodeDef = isCycle ? `${n.id.replace(/[^a-zA-Z]/g, '')}("${cleanLabel}"):::cycle` : `${n.id.replace(/[^a-zA-Z]/g, '')}("${cleanLabel}")`;
        mermaid += `    ${nodeDef}\n`;
    });

    // Edges
    edges.forEach(e => {
        const s = (e.source as string).replace(/[^a-zA-Z]/g, '');
        const t = (e.target as string).replace(/[^a-zA-Z]/g, '');
        mermaid += `    ${s} --> ${t}\n`;
    });

    mermaid += '\n    classDef cycle fill:#f96,stroke:#333,stroke-width:4px;\n';
    return mermaid;
}

function generateHtml(analysis: AnalysisSummary): string {
    // Basic D3.js template (similar to the one in viewProvider)
    return `
<!DOCTYPE html>
<html>
<head>
    <title>OptiMap Live Preview</title>
    <script src="https://d3js.org/d3.v7.min.js"></script>
    <style>
        body { margin: 0; background: #1a1a1a; color: white; font-family: sans-serif; overflow: hidden; height: 100vh; }
        #canvas { width: 100%; height: 100%; }
        .node { stroke: #3498db; stroke-width: 2px; }
        .link { stroke: #555; stroke-opacity: 0.6; }
        .label { fill: white; font-size: 12px; pointer-events: none; text-anchor: middle; }
    </style>
</head>
<body>
    <div id="canvas"></div>
    <script>
        const data = ${JSON.stringify(analysis)};
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        const svg = d3.select("#canvas").append("svg").attr("width", width).attr("height", height);
        const container = svg.append("g");
        
        const simulation = d3.forceSimulation(data.graph.nodes)
            .force("link", d3.forceLink(data.graph.edges).id(d => d.id).distance(150))
            .force("charge", d3.forceManyBody().strength(-500))
            .force("center", d3.forceCenter(width / 2, height / 2));

        const link = container.append("g").selectAll("line").data(data.graph.edges).enter().append("line").attr("class", "link");
        const node = container.append("g").selectAll("circle").data(data.graph.nodes).enter().append("circle")
            .attr("r", 10).attr("fill", "#1a3a5a").attr("class", "node")
            .call(d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended));

        const label = container.append("g").selectAll("text").data(data.graph.nodes).enter().append("text")
            .text(d => d.label).attr("class", "label").attr("dy", -15);

        simulation.on("tick", () => {
            link.attr("x1", d=>d.source.x).attr("y1", d=>d.source.y).attr("x2", d=>d.target.x).attr("y2", d=>d.target.y);
            node.attr("cx", d=>d.x).attr("cy", d=>d.y);
            label.attr("x", d=>d.x).attr("y", d=>d.y);
        });

        function dragstarted(event, d) { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
        function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
        function dragended(event, d) { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }
        
        svg.call(d3.zoom().on("zoom", (event) => { container.attr("transform", event.transform); }));
    </script>
</body>
</html>
    `.trim();
}
