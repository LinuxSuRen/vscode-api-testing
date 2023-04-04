// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const PROTO_PATH = __dirname +'/server.proto';
const packageDefinition = protoLoader.loadSync(
  PROTO_PATH, { 
   keepCase: true,
   longs: String,
   enums: String,
   defaults: true,
   oneofs: true,
});

const serverProto = grpc.loadPackageDefinition(packageDefinition).server;
const apiConsole = vscode.window.createOutputChannel("API Testing")


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	console.log('Congratulations, your extension "api-testing" is now active!');

	let atest = vscode.commands.registerCommand('atest', function() {
		if(vscode.workspace.workspaceFolders !== undefined) {
			let filename = vscode.window.activeTextEditor.document.fileName
			const addr = vscode.workspace.getConfiguration().get('api-testing.server')
			apiConsole.show()
			let task 

			let editor = vscode.window.activeTextEditor
			if (editor) {
				let selection = editor.selection
				let text = editor.document.getText(selection)
				if (text !== undefined && text !== '') {
					task = text
				}
			}

			if (task === undefined || task === '') {
				const data = fs.readFileSync(filename);
				task = data.toString()
			}

			const client = new serverProto.Runner(addr, grpc.credentials.createInsecure());
			client.run({
				kind: "suite",
				data: task
			} , function(err, response) {
				if (err !== undefined && err !== null) {
					apiConsole.appendLine(err + " with " + addr);
				} else {
					apiConsole.appendLine(response.message);
				}
			 });
		}  else {
			let message = "YOUR-EXTENSION: Working folder not found, open a folder an try again" ;
		
			vscode.window.showErrorMessage(message);
		}
	})

	context.subscriptions.push(atest);
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
