import { getFullAnalysis } from './analyzer';

async function runCli() {
    console.log("--- OPTIMAP AGENT BRIDGE ---");
    const analysis = await getFullAnalysis();
    
    console.log(JSON.stringify(analysis, null, 2));
    console.log("--- END ANALYSIS ---");
}

runCli().catch(err => {
    console.error(err);
    process.exit(1);
});
