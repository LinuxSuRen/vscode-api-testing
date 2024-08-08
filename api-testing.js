const vscode = require('vscode');
const codeLense = (document, token) => {
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
}

module.exports = codeLense;