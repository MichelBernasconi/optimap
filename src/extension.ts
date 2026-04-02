import * as vscode from 'vscode';
import { OptiMapProvider } from './viewProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('OptiMap is now active!');

	const provider = new OptiMapProvider(context.extensionUri);

    // Register Sidebar Webview
	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(OptiMapProvider.viewType, provider)
	);

	// Command to open the full interactive map (can still exist as a separate tab)
	context.subscriptions.push(
		vscode.commands.registerCommand('optimap.analyze', async () => {
			// This command now just refreshes and focuses the sidebar
            vscode.commands.executeCommand('workbench.view.extension.optimap-explorer');
            provider.refresh();
		})
	);

    // Initial scan on load
    provider.refresh();
}

export function deactivate() {}
