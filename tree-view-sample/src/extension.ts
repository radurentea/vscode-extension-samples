'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

import { DepNodeProvider, Dependency } from './nodeDependencies';
import { JsonOutlineProvider } from './jsonOutline';
import { FtpExplorer } from './ftpExplorer';
import { FileExplorer } from './fileExplorer';
import { TestViewDragAndDrop } from './testViewDragAndDrop';
import { TestView } from './testView';

export function activate(context: vscode.ExtensionContext) {
	const rootPath = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;

	// Samples of `window.registerTreeDataProvider`
	const nodeDependenciesProvider = new DepNodeProvider(rootPath);
	vscode.window.registerTreeDataProvider('nodeDependencies', nodeDependenciesProvider);
	vscode.commands.registerCommand('nodeDependencies.refreshEntry', () => nodeDependenciesProvider.refresh());
	vscode.commands.registerCommand('extension.openPackageOnNpm', moduleName => vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(`https://www.npmjs.com/package/${moduleName}`)));
	vscode.commands.registerCommand('nodeDependencies.addEntry', () => vscode.window.showInformationMessage(`Successfully called add entry.`));
	vscode.commands.registerCommand('nodeDependencies.editEntry', (node: Dependency) => vscode.window.showInformationMessage(`Successfully called edit entry on ${node.label}.`));
	vscode.commands.registerCommand('nodeDependencies.deleteEntry', (node: Dependency) => vscode.window.showInformationMessage(`Successfully called delete entry on ${node.label}.`));

	const jsonOutlineProvider = new JsonOutlineProvider(context);
	vscode.window.registerTreeDataProvider('jsonOutline', jsonOutlineProvider);
	vscode.commands.registerCommand('jsonOutline.refresh', () => jsonOutlineProvider.refresh());
	vscode.commands.registerCommand('jsonOutline.refreshNode', offset => jsonOutlineProvider.refresh(offset));
	vscode.commands.registerCommand('jsonOutline.renameNode', args => {
		let offset = undefined;
		if (args.selectedTreeItems && args.selectedTreeItems.length) {
			offset = args.selectedTreeItems[0];
		} else if (typeof args === 'number') {
			offset = args;
		}
		if (offset) {
			jsonOutlineProvider.rename(offset);
		}
	});
	vscode.commands.registerCommand('extension.openJsonSelection', range => jsonOutlineProvider.select(range));

	// Samples of `window.createView`
	new FtpExplorer(context);
	new FileExplorer(context);

	// Test View
	new TestView(context);

	new TestViewDragAndDrop(context);

	// ERROR HINTS

	const treeDataProvider = new ErrorHintProvider(context);
    vscode.window.registerTreeDataProvider('errorHints', treeDataProvider);

    vscode.commands.registerCommand('extension.searchError', async () => {
        const errorMsg = await vscode.window.showInputBox({ placeHolder: 'Enter the error message' });
        if (errorMsg) {
            treeDataProvider.searchError(errorMsg);
        }
    });

	vscode.commands.registerCommand('extension.promptErrorSearch', async () => {
		const errorMsg = await vscode.window.showInputBox({
			placeHolder: 'Enter the error message'
		});
		if (errorMsg) {
			treeDataProvider.searchError(errorMsg);
		}
	});

}

class ErrorHint {
	constructor(public readonly label: string) { }
}

class ErrorHintProvider implements vscode.TreeDataProvider<ErrorHint> {
	constructor(private context: vscode.ExtensionContext) { }
	private _onDidChangeTreeData: vscode.EventEmitter<ErrorHint | undefined | null | void> = new vscode.EventEmitter<ErrorHint | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<ErrorHint | undefined | null | void> = this._onDidChangeTreeData.event;

	private data: ErrorHint[] = [];

	searchError(errorMsg: string) {
		console.log(`Searching for: ${errorMsg}`);  // Log the search query


		// somewhere in your code where you have access to the `context` object
		const filePath = path.join(this.context.extensionPath, 'hints.yml');


	
		// Load the hints from your YAML file
		const fileContents = fs.readFileSync(filePath, 'utf-8');
		const hintsData = yaml.load(fileContents) as any;
	
		// Search the hints based on the errorMsg and populate the data array
		this.data = [];
		for (const error of hintsData.errors) {
			if (error.type.includes(errorMsg)) {
				this.data.push(new ErrorHint(`${error.type}: ${error.hint}`));
				console.log(`Found hint: ${error.type}: ${error.hint}`);  // Log found hint
			}
		}
	
		if (!this.data.length) {
			console.log('No hints found');  // Log if no hints found
		}
	
		// Refresh the tree view
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: ErrorHint): vscode.TreeItem {
		return {
			label: element.label,
			tooltip: element.label
		};
	}

	getChildren(element?: ErrorHint): Thenable<ErrorHint[]> {
		if (element) {
			return Promise.resolve([]);
		} else {
			return Promise.resolve(this.data);
		}
	}
}