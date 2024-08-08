const vscode = require('vscode');
const fs = require('fs');

const codeLense = (document, token) => {
    const range = new vscode.Range(0, 1, 10, 10)
    const lens = new vscode.CodeLens(range, {
        command: 'atest.startMock',
        title: 'Start Mock Server'
    })
    return [lens]
}

const terminalName = 'atest mock'
const startMock = (filename) => {
    let arg = ''

    const data = fs.readFileSync(filename);
    data.toString().split('\n').forEach(function(line) {
        // find the argument line which start with #!arg and get the argument
        if (line.startsWith("#!arg")) {
            arg = line.substring(5)
            return
        }
    });

    let terminal
    vscode.window.terminals.forEach(t => {
        if (t.name === terminalName) {
            terminal = t
        }
    })

    if (!terminal) {
        terminal = vscode.window.createTerminal({name:terminalName})
    }
    terminal.show()
    terminal.sendText(`atest mock ${filename} ${arg}`)
}

module.exports = {
    codeLense, startMock
};
