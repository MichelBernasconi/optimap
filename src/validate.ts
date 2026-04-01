import * as fs from 'fs';
import * as path from 'path';
import { GraphData, parseMarkdownLinks, extractLabel, parseLogFile, TraceStep } from './parser';

/**
 * Validation script to test OptiMap's core logic without a VS Code environment.
 */
async function validate() {
    console.log('--- OptiMap Validation Start ---');

    const projectRoot = process.cwd();
    const files = ['mock_workflow.md', 'step2.md', 'issues.md'];
    
    console.log('\n[1] Testing File Labeling:');
    files.forEach(f => {
        const fullPath = path.resolve(projectRoot, f);
        if (fs.existsSync(fullPath)) {
            const label = extractLabel(fullPath);
            console.log(`  - File: ${f} -> Label: "${label}"`);
        } else {
            console.error(`  - File ${f} NOT FOUND in root!`);
        }
    });

    console.log('\n[2] Testing Link Parsing:');
    files.forEach(f => {
        const fullPath = path.resolve(projectRoot, f);
        if (fs.existsSync(fullPath)) {
            const links = parseMarkdownLinks(fullPath);
            console.log(`  - ${f} links to: [${links.map(l => path.basename(l)).join(', ')}]`);
        }
    });

    console.log('\n[3] Testing Trace Parsing (Log File):');
    const logFile = path.resolve(projectRoot, 'trace.log');
    if (fs.existsSync(logFile)) {
        const trace = await parseLogFile(logFile);
        console.log(`  - Found ${trace.length} steps in log:`);
        trace.forEach((step: TraceStep, i: number) => {
            console.log(`    Step ${i+1}: ${path.basename(step.nodeId)} (${step.action})`);
        });
    } else {
        console.error('  - trace.log NOT FOUND in root!');
    }

    console.log('\n--- Validation Finished ---');
}

validate().catch(console.error);
