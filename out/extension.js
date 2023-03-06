"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageConverter = exports.activate = void 0;
const vscode = require("vscode");
const COMMAND = 'devcontainer-image-convert.command';
// Activate the extension - it'll activate on jsonc files (designated in package.json "activationEvents")
function activate(context) {
    context.subscriptions.push(vscode.languages.registerCodeActionsProvider('jsonc', new ImageConverter(), {
        providedCodeActionKinds: ImageConverter.providedCodeActionKinds
    }));
    context.subscriptions.push(vscode.commands.registerCommand(COMMAND, () => vscode.env.openExternal(vscode.Uri.parse('https://containers.dev/guide/dockerfile'))));
}
exports.activate = activate;
// Provides code action for converting "image" in devcontainer.json to a Dockerfile
class ImageConverter {
    provideCodeActions(document, range) {
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
    isAtStartOfImage(document, range) {
        const start = range.start;
        const line = document.lineAt(start.line);
        //return line.text[start.character] === ':' && line.text[start.character + 1] === ')';
        if (line.text.includes('image')) {
            return line;
        }
        return false;
    }
    createFix(document, range, emoji, line) {
        // Get the end of the line, minus the comma if it exists (meaning there are further properties after "image")
        let end = line.text.length - 1;
        if (line.text.endsWith(',')) {
            end = end - 1;
        }
        // Use 10 for the number of characters in the string "image": "
        // TODO: Parse json objects instead of text
        const updatedLine = line.text.substring(line.text.indexOf('"image": "') + 10, end);
        const fix = new vscode.CodeAction('Convert to Dockerfile', vscode.CodeActionKind.RefactorMove);
        fix.edit = new vscode.WorkspaceEdit();
        // Create path and file for new Dockerfile
        const updatedPath = vscode.Uri.joinPath(document.uri, '../', emoji);
        const newFile = vscode.Uri.file(updatedPath.fsPath);
        // Create Dockerfile if it doesn't exist
        // Insert the image contents with FROM
        fix.edit.createFile(newFile, { ignoreIfExists: true });
        fix.edit.insert(newFile, new vscode.Position(0, 0), 'FROM ' + updatedLine);
        // vscode.workspace.applyEdit(fix.edit).then(() => {
        return fix;
        /*
        TODO:
         1. Replace the "image" property in devcontainer.json with "build": "."
         2. Better handle if Dockerfile already exists (rather than silently failing): give option to cancel or overwrite, and overwrite will replace existing contents rather than write same FROM contents again
         3. Open the Dockerfile automatically after creation (or provide an extension setting to open Dockerfile automatically)
        */
    }
    createCommand() {
        const action = new vscode.CodeAction('Learn more...', vscode.CodeActionKind.Empty);
        action.command = { command: COMMAND, title: 'Learn more about images and Dockerfiles in dev containers', tooltip: 'This will open docs on using images, Dockerfiles, and Docker Compose.' };
        return action;
    }
}
exports.ImageConverter = ImageConverter;
ImageConverter.providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix
];
//# sourceMappingURL=extension.js.map