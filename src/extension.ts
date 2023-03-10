import * as vscode from 'vscode';

const COMMAND = 'devcontainer-image-convert.command';

// Activate the extension - it'll activate on jsonc files (designated in package.json "activationEvents")
export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.languages.registerCodeActionsProvider('jsonc', new ImageConverter(), {
			providedCodeActionKinds: ImageConverter.providedCodeActionKinds
		}));

	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND, () => vscode.env.openExternal(vscode.Uri.parse('https://containers.dev/guide/dockerfile')))
	);
}

// Provides code action for converting "image" in devcontainer.json to a Dockerfile
export class ImageConverter implements vscode.CodeActionProvider {

	public static readonly providedCodeActionKinds = [
		vscode.CodeActionKind.QuickFix
	];

	public provideCodeActions(document: vscode.TextDocument, range: vscode.Range): vscode.CodeAction[] | undefined {
		const line = this.isAtStartOfImage(document, range);
		if (line === false) {
			return;
		}

		const replaceWithDockerfile = this.createFix(document, range, 'Dockerfile', line);

		const commandAction = this.createCommand();

		return [
			replaceWithDockerfile,
			commandAction
		];
	}

	// Check for the word "image" in a jsonc file
	// TODO: Parse json objects instead of text
	private isAtStartOfImage(document: vscode.TextDocument, range: vscode.Range) {
		const start = range.start;
		const line = document.lineAt(start.line);
		//return line.text[start.character] === ':' && line.text[start.character + 1] === ')';
		if (line.text.includes('image')) {
			return line;
		}
		return false;
	}

	private createFix(document: vscode.TextDocument, range: vscode.Range, fileName: string, line: vscode.TextLine): vscode.CodeAction {
		// Get the end of the line, minus the comma if it exists (meaning there are further properties after "image")
		let end = line.text.length - 1;
		if(line.text.endsWith(',')) {
			end = end - 1;
		}

		// Use 10 for the number of characters in the string "image": "
		// TODO: Parse json objects instead of text
		const updatedLine = line.text.substring(line.text.indexOf('"image": "') + 10, end);
		const fix = new vscode.CodeAction('Convert to Dockerfile', vscode.CodeActionKind.RefactorMove);
		fix.edit = new vscode.WorkspaceEdit();

		// Create path and file for new Dockerfile
		const updatedPath = vscode.Uri.joinPath(document.uri, '../', fileName);
		const newFile = vscode.Uri.file(updatedPath.fsPath); 
		
		// Create Dockerfile if it doesn't exist
		// Insert the image contents with FROM
		fix.edit.createFile(newFile, { ignoreIfExists: true });
		fix.edit.insert(newFile, new vscode.Position(0, 0), 'FROM ' + updatedLine);

		// Start the process to replace the "image" property in devcontainer.json
		// Get the index of the first " in the line (aka where the "image" property starts)
		const startLineText = line.text.indexOf('"');

		// Convert startLineText to a Position (required for Range function)
		const startLineTextPosition = new vscode.Position(line.range.start.line, startLineText);

		// Replace the "image" property in devcontainer.json with `"build": { "dockerfile": "Dockerfile" },`
		const dockerfileString = `"build": {
		// Path is relataive to the devcontainer.json file.
		"dockerfile": "Dockerfile"
	},`;
		fix.edit.replace(document.uri, new vscode.Range(startLineTextPosition, line.range.end), dockerfileString);

		return fix;

		/* 
		TODO: 
		 1. Better handle if Dockerfile already exists (rather than silently failing): give option to cancel or overwrite, and overwrite will replace existing contents rather than write same FROM contents again
		 2. Open the Dockerfile automatically after creation (or provide an extension setting to open Dockerfile automatically)
		 	
		 	Possible solution (need to determine where to place):
			// Open the Dockerfile automatically after creation
			try {
				vscode.workspace.fs.stat(newFile);
				vscode.window.showTextDocument(newFile, { viewColumn: vscode.ViewColumn.Beside });
			} catch {
				vscode.window.showInformationMessage(`${newFile.toString(true)} file does *not* exist`);
				console.log('File does not exist');
			}
		*/
	}

	private createCommand(): vscode.CodeAction {
		const action = new vscode.CodeAction('Learn more...', vscode.CodeActionKind.Empty);
		action.command = { command: COMMAND, title: 'Learn more about images and Dockerfiles in dev containers', tooltip: 'This will open docs on using images, Dockerfiles, and Docker Compose.' };
		return action;
	}

}