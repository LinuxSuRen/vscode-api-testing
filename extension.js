// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const fs = require('fs');
const https = require('follow-redirects').https;
const yaml = require('js-yaml');
const cp = require('child_process');
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
const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left)
statusBar.text = "$(warning) ATest"

setInterval(function() {
	cp.exec('atest service status', (err) => {
		if (err) {
			statusBar.text = "$(warning) ATest"
		} else {
			statusBar.text = "$(pass) ATest"
		}
	})
}, 3000);


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	statusBar.show()
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
				title: 'run suite'
			})
			const lensRunWith = new vscode.CodeLens(range, {
				command: 'atest.runwith',
				title: 'run suite with env'
			})
			let result = [lens, lensRunWith]

			// for test cases
			for (let i = 0; i < document.lineCount; i++) {
				let nameAnchor = document.lineAt(i).text
				nameAnchor = nameAnchor.trimLeft(' ', '')
				if (nameAnchor.startsWith('- name: ')) {
					let name = nameAnchor.replace('- name: ', '')
					const range = new vscode.Range(i, 1, i, 10)
					const testcaseLens = new vscode.CodeLens(range, {
						command: 'atest',
						title: 'run',
						arguments: [name, "info"]
					})
					const testcaseDebugLens = new vscode.CodeLens(range, {
						command: 'atest',
						title: 'debug',
						arguments: [name, "debug"]
					})
					result.push(testcaseLens, testcaseDebugLens)
				}
			}

			return result
		},
		resolveCodeLens: function (code,token) {
			return code
		}
	  }

	const codeLens = vscode.languages.registerCodeLensProvider({ language: 'yaml', scheme: 'file' }, toggleLink)
	context.subscriptions.push(codeLens, statusBar)

	let atest = vscode.commands.registerCommand('atest', function(name, level) {
		if(vscode.workspace.workspaceFolders !== undefined) {
			let filename = vscode.window.activeTextEditor.document.fileName
			const addr = vscode.workspace.getConfiguration().get('api-testing.server')
			const clean = vscode.workspace.getConfiguration().get('api-testing.clean-console')
			apiConsole.show()
			if (clean) {
				apiConsole.clear()
			}

			const data = fs.readFileSync(filename);
			let task = data.toString()
			let kind = "suite"
			let caseName = ""
			if (name) {
				kind = "testcaseInSuite"
				caseName = name
			}

			const client = new serverProto.Runner(addr, grpc.credentials.createInsecure());
			client.run({
				kind: kind,
				data: task,
				caseName: caseName,
				level: level
			} , function(err, response) {
				if (err !== undefined && err !== null) {
					apiConsole.appendLine(err + " with " + addr);
				} else {
					apiConsole.appendLine(response.message);
					apiConsole.appendLine(response.error);
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
				const clean = vscode.workspace.getConfiguration().get('api-testing.clean-console')
				apiConsole.show()
				if (clean) {
					apiConsole.clear()
				}

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
						apiConsole.appendLine(response.error);
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

	let atestSample = vscode.commands.registerCommand('atest.sample', function(args) {
		const addr = vscode.workspace.getConfiguration().get('api-testing.server')
		const clean = vscode.workspace.getConfiguration().get('api-testing.clean-console')
		const client = new serverProto.Runner(addr, grpc.credentials.createInsecure());
		client.sample({} , function(err, response) {
			if (err !== undefined && err !== null) {
				apiConsole.show()
				if (clean) {
					apiConsole.clear()
				}
				apiConsole.appendLine(err + " with " + addr);
			} else {
				const wsedit = new vscode.WorkspaceEdit();
				const wsPath = vscode.workspace.workspaceFolders[0].uri.fsPath;
				const filePath = vscode.Uri.file(wsPath + '/sample.yaml');
				wsedit.createFile(filePath, { ignoreIfExists: true });
				wsedit.insert(filePath, new vscode.Position(0, 0), response.message);
				vscode.workspace.applyEdit(wsedit);

				vscode.workspace.openTextDocument(filePath);
			}
		});
	})

	context.subscriptions.push(atest, atestRunWith, atestSample);

	var which = require('which')
	which('atest', { nothrow: true }).then((p) => {
		if (p) {
			startAtestServer()
		} else {
			vscode.window.showInformationMessage('Start to install API Testing.')
			https.get("https://ghproxy.com/https://github.com/LinuxSuRen/api-testing/releases/latest/download/atest-linux-amd64.tar.gz", function(response) {
				const file = fs.createWriteStream('/tmp/atest.tar.gz');
				response.pipe(file);
				vscode.window.showInformationMessage('Receiving API Testing binary file.')

				// after download completed close filestream
				file.on("finish", () => {
					file.close(() => {
						vscode.window.showInformationMessage('API Testing server downloaded.')

						try {
							fs.accessSync('/usr/local/bin', fs.constants.W_OK);

							cp.execSync('tar xzvf /tmp/atest.tar.gz atest && install atest /usr/local/bin/atest')
							startAtestServer()
						} catch (err) {
							vscode.window.showInformationMessage('Install atest in a new terminal?', 'Yes', "No").then((v)=>{
								if (v === 'Yes') {
									let terminal=vscode.window.createTerminal({name:'atest'})
									terminal.sendText('tar xzvf /tmp/atest.tar.gz atest && sudo install atest /usr/local/bin/atest && rm -rf atest && sudo atest service install && sudo atest service start && exit')
									terminal.show()
								}
							})
						}

						vscode.window.showInformationMessage('API Testing service is ready.')
					})
				});
			}).on('error', (e) => {
				vscode.window.showErrorMessage('Failed to install API Testing.' + e)
			});
		}
	})

	context.subscriptions.push(vscode.languages.registerDocumentSymbolProvider({ scheme: 'file', language: 'yaml' }, {
		provideDocumentSymbols(document) {
			const symbols = [];
			if (document.lineAt(0).text === '#!api-testing') {
				const regex = new RegExp('^- name:');
				for (let i = 0; i < document.lineCount; i++) {
					const line = document.lineAt(i);
					if (line.text.match(regex)) {
						const symbol = new vscode.DocumentSymbol(
							line.text.replace('- name: ', ''),
							'',
							vscode.SymbolKind.Namespace,
							line.range,
							line.range
						);
						symbols.push(symbol);
					}
				}
				return symbols;
			}
		}
	}))
}

function startAtestServer() {
	cp.exec('atest service status', (err) => {
		if (err) {
			cp.exec('atest service install', (err) => {
				if (!err){
					cp.exec("atest service start", (err) => {
						if (err) {
							vscode.window.showErrorMessage('Failed to start API Testing service. ' + err)
							statusBar.show()
							statusBar.color = 'red'
						}
					})
				} else {
					vscode.window.showInformationMessage('Require root permission to install atest service?', 'Yes', "No").then((v)=>{
						if (v === 'Yes') {
							let terminal=vscode.window.createTerminal({name:'atest'})
							terminal.sendText('sudo atest service install && sudo atest service start && exit')
						}
					})
				}
			})
		}
	})
}

const defaultEnv = `- name: localhost
  env:
    SERVER: http://localhost:7070`

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
