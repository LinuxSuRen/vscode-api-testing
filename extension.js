// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const yaml = require('js-yaml');

const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { isLength } = require('lodash');
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

	const toggleLink = {
		provideCodeLenses: function (document, token) {
			if (document.lineAt(0).text !== "#!api-testing") {
				return []
			}

			// for the whole test suite
			const range = new vscode.Range(0, 1, 10, 10)
			const lens = new vscode.CodeLens(range, {
				command: 'atest',
				title: 'Run Suite'
			})
			const lensRunWith = new vscode.CodeLens(range, {
				command: 'atest.runwith',
				title: 'Run Suite With Env'
			})
			let result = [lens, lensRunWith]

			// for test cases
			for (let i = 0; i < document.lineCount; i++) {
				let nameAnchor = document.lineAt(i).text
				if (nameAnchor.startsWith('- name: ')) {
					let name = nameAnchor.replace('- name: ', '')
					const range = new vscode.Range(i, 1, i, 10)
					const testcaseLens = new vscode.CodeLens(range, {
						command: 'atest',
						title: 'Run Case',
						arguments: [name]
					})
					result.push(testcaseLens)
				}
			}

			return result
		},
		resolveCodeLens: function (code,token) {
			return code
		}
	  }

	const codeLens = vscode.languages.registerCodeLensProvider({ language: 'yaml', scheme: 'file' }, toggleLink)
	context.subscriptions.push(codeLens)

	let atest = vscode.commands.registerCommand('atest', function(args) {
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

			let kind = "suite"
			let caseName = ""
			if (args && args.length > 0) {
				kind = "testcaseInSuite"
				caseName = args
			}

			const client = new serverProto.Runner(addr, grpc.credentials.createInsecure());
			client.run({
				kind: kind,
				data: task,
				caseName: caseName
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

	
	let atestRunWith = vscode.commands.registerCommand('atest.runwith', function(args) {
		const dir = require('path').dirname(vscode.window.activeTextEditor.document.uri.fsPath)

		try {
			const doc = yaml.load(fs.readFileSync(dir + '/env.yaml', 'utf8'))
			let items = []
			let dataMap = {}
			for (let i = 0; i < doc.length; i++) {
				items.push(doc[i].name)
				dataMap[doc[i].name] = doc[i].env
			}

			vscode.window.showQuickPick(items).then((val) => {
				let filename = vscode.window.activeTextEditor.document.fileName
				const addr = vscode.workspace.getConfiguration().get('api-testing.server')
				apiConsole.show()
				const data = fs.readFileSync(filename);
				const task = data.toString()

				let kind = "suite"
				let caseName = ""
				if (args && args.length > 0) {
					kind = "testcaseInSuite"
					caseName = args
				}

				const client = new serverProto.Runner(addr, grpc.credentials.createInsecure());
				client.run({
					kind: kind,
					data: task,
					caseName: caseName,
					env: dataMap[val]
				} , function(err, response) {
					if (err !== undefined && err !== null) {
						apiConsole.appendLine(err + " with " + addr);
					} else {
						apiConsole.appendLine(response.message);
					}
				});
			})
		} catch (e) {
			vscode.window.showInformationMessage("Env file is missing. Do you want to create it?", "Yes", "No").then(answer => {
				if (answer === "Yes") {
					const wsedit = new vscode.WorkspaceEdit();
					const filePath = vscode.Uri.file(dir + '/env.yaml');
					var contents = new TextEncoder().encode(defaultEnv);
					wsedit.createFile(filePath, {
						ignoreIfExists: true,
						contents: contents
					});
					vscode.workspace.applyEdit(wsedit);
				}
			})
		}
	})

	context.subscriptions.push(atest, atestRunWith);
}

const defaultEnv = `- name: localhost
  env:
    SERVER: http://localhost:9090`

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
