import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    const helloWorld = vscode.commands.registerCommand('curator.helloWorld', () => {
        vscode.window.showInformationMessage('Hello from Curator!');
    });

    context.subscriptions.push(helloWorld);
}

export function deactivate() {}
