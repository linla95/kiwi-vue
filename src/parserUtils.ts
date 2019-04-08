/**
 * @author linhuiw
 * @desc parser 相关的工具方法
 */
import * as vscode from 'vscode';

export function trimWhiteSpace(code: string, startPos: vscode.Position, endPos: vscode.Position) {
  const lines = code.split('\n');
  const hasContentLines = [];
  const columnOfLine = {};
  for (let i = startPos.line; i <= endPos.line; i++) {
    const line = lines[i];
    let colStart = 0;
    let colEnd = line.length;
    if (i === startPos.line) {
      colStart = startPos.character;
    }
    if (i === endPos.line) {
      colEnd = endPos.character;
    }
    const text = line.slice(colStart, colEnd).trim();
    if (text.length) {
      hasContentLines.push(i);
      /** 如果文字前面，全是空格 */
      if (!colStart) {
        colStart = line.length - (line as any).trimLeft().length;
      }
    }
    columnOfLine[i] = [colStart, colEnd];
  }
  const startLine = Math.min(...hasContentLines);
  const startCol = Math.min(...(columnOfLine[startLine]));
  const endLine = Math.max(...hasContentLines);
  const endCol = Math.max(...(columnOfLine[endLine]));

  return {
    trimStart: new vscode.Position(startLine, startCol),
    trimEnd: new vscode.Position(endLine, endCol)
  }
}
export function trimSpacePosition (element: any) {
  let str = element.text
  let value = element.text.trim()
  let offset = str.indexOf(value)
  const activeEditor = vscode.window.activeTextEditor;
  return {
    trimSpaceStartPos: activeEditor.document.positionAt(offset + element.start),
    trimSpaceEndPos: activeEditor.document.positionAt(offset + element.start + value.length)
  }
}