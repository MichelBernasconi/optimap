import * as vscode from 'vscode';
import { OptiMapProvider } from './viewProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "OptiMap" is now active!');

	const provider = new OptiMapProvider(context.extensionUri);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	const helloWorldDisposable = vscode.commands.registerCommand('optimap.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from OptiMap!');
	});

	const analyzeDisposable = vscode.commands.registerCommand('optimap.analyze', async () => {
		await provider.show();
	});

	context.subscriptions.push(helloWorldDisposable, analyzeDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
