/**
 * @author linhuiw
 * @desc 利用 Ast 查找对应文件中的中文文案
 */
import * as ts from 'typescript';
import * as vscode from 'vscode';
import * as compiler from '@angular/compiler';
import { DOUBLE_BYTE_REGEX } from './const';
import { trimWhiteSpace, trimSpacePosition } from './parserUtils';
import { removeFileComment } from './astUtils';
import * as vueCompiler from 'vue-template-compiler'

/**
 * 查找 Ts 文件中的中文
 * @param code
 */
function findTextInTs(code: string, fileName: string) {
  const matches = [];
  const activeEditor = vscode.window.activeTextEditor;

  const ast = ts.createSourceFile(
    '',
    code,
    ts.ScriptTarget.ES2015,
    true,
    ts.ScriptKind.TSX
  );

  function visit(node: ts.Node) {
    switch(node.kind) {
      case ts.SyntaxKind.StringLiteral: {
        /** 判断 Ts 中的字符串含有中文 */
        const { text } = node as ts.StringLiteral;
        if (text.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除引号 */
          const startPos = activeEditor.document.positionAt(start + 1);
          const endPos = activeEditor.document.positionAt(end - 1);
          const range = new vscode.Range(startPos, endPos);
          matches.push({
            range,
            text,
            isString: true
          });
        }
        break;
      }
      case ts.SyntaxKind.JsxElement: {
        const { children } = node as ts.JsxElement;

        children.forEach(child => {
          if (child.kind === ts.SyntaxKind.JsxText) {
            const text = child.getText();
            /** 修复注释含有中文的情况，Angular 文件错误的 Ast 情况 */
            const noCommentText = removeFileComment(text, fileName);

            if (noCommentText.match(DOUBLE_BYTE_REGEX)) {
              const start = child.getStart();
              const end = child.getEnd();
              const startPos = activeEditor.document.positionAt(start);
              const endPos = activeEditor.document.positionAt(end);
              const { trimStart, trimEnd } = trimWhiteSpace(code, startPos, endPos);
              const range = new vscode.Range(trimStart, trimEnd);

              matches.push({
                range,
                text: text.trim(),
                isString: false
              });
            }
          }
        });
        break;
      }
      case ts.SyntaxKind.TemplateExpression: {
        const { pos, end } = node;
        const templateContent = code.slice(pos, end);

        if (templateContent.match(DOUBLE_BYTE_REGEX)) {
          // @TODO: 逻辑待完善
        }
      }
    }

    ts.forEachChild(node, visit);
  }
  ts.forEachChild(ast, visit);

  return matches;
}

/**
 * 查找 HTML 文件中的中文
 * @param code
 */
function findTextInHtml(code) {
  const matches = [];
  const activeEditor = vscode.window.activeTextEditor;
  const ast = compiler.parseTemplate(code, 'ast.html', {
    preserveWhitespaces: false
  });
  function visit(node) {
    const value = node.value;
    if (value && (typeof value === 'string') && value.match(DOUBLE_BYTE_REGEX)) {
      const valueSpan = node.valueSpan || node.sourceSpan;
      let { start: { offset: startOffset }, end: { offset: endOffset } } = valueSpan;
      const nodeValue = code.slice(startOffset, endOffset);
      let startPos, endPos;
      let isString = false;
      /** 处理带引号的情况 */
      if (nodeValue.charAt(0) === '"' || nodeValue.charAt(0) === '\'') {
        startPos = activeEditor.document.positionAt(startOffset + 1);
        endPos = activeEditor.document.positionAt(endOffset - 1);
        isString = true;
      } else {
        startPos = activeEditor.document.positionAt(startOffset);
        endPos = activeEditor.document.positionAt(endOffset);
      }
      const { trimStart, trimEnd } = trimWhiteSpace(code, startPos, endPos);
      const range = new vscode.Range(trimStart, trimEnd);
      matches.push({
        range,
        text: value,
        isString
      });
    } else if (value && typeof value === "object" && value.source && value.source.match(DOUBLE_BYTE_REGEX)) {
      /**
       * <span>{{expression}}中文</span> 这种情况的兼容
       */
      const chineseMatches = value.source.match(DOUBLE_BYTE_REGEX);
      chineseMatches.map((match) => {
        const valueSpan = node.valueSpan || node.sourceSpan;
        let { start: { offset: startOffset }, end: { offset: endOffset } } = valueSpan;
        const nodeValue = code.slice(startOffset, endOffset);
        const start = nodeValue.indexOf(match);
        const end = start + match.length;
        let startPos = activeEditor.document.positionAt(startOffset + start);
        let endPos = activeEditor.document.positionAt(startOffset + end);
        const { trimStart, trimEnd } = trimWhiteSpace(code, startPos, endPos);
        const range = new vscode.Range(trimStart, trimEnd);
        matches.push({
          range,
          text: match[0],
          isString: false
        });
      });
    }

    if (node.children && node.children.length) {
      node.children.forEach(visit);
    }
    if (node.attributes && node.attributes.length) {
      node.attributes.forEach(visit);
    }
  }

  if (ast.nodes && ast.nodes.length) {
    ast.nodes.forEach(visit);
  }
  return matches;
}
/** 查找 vue 文件中的中文
 * @param  {} code
 * @param  {} fileName
 */
function findTextInVue (code, fileName) {
  let matches = []
  const activeEditor = vscode.window.activeTextEditor;
  // 1.查找template里的中文
  const vueAst = vueCompiler.compile(code, {outputSourceRange: true}).ast
  let QUOTE = /([\'\"])(.*?)[\'\"]/g
  function visitVueAst (nodes: Array<any>) {
    nodes.forEach(element => {
      // template中的处理文字
      if (element.text && element.text.trim()) {
        if (element.static || !element.text.match(QUOTE)) {
          let {trimSpaceStartPos, trimSpaceEndPos} = trimSpacePosition(element)
          let range = new vscode.Range(trimSpaceStartPos, trimSpaceEndPos)
          matches.push({
            range,
            text: element.text.trim(),
            isTemplatePureString: true // 需要转为 {{ $t('xxxx')}}
          })
        } else {
          const strings = element.text.match(QUOTE)
          Array.isArray(strings) && strings.forEach(str => {
            if (str.match(DOUBLE_BYTE_REGEX)) {
              let start = element.text.indexOf(str)
              let end = start + str.length
              // 加一减一去除引号
              let realStr = element.text.substring(start+1, end-1)
              let startPos = activeEditor.document.positionAt(element.start + start + 1)
              let endPos = activeEditor.document.positionAt(element.start + end -1)              
              let range = new vscode.Range(startPos, endPos)
              matches.push({
                range,
                text: realStr
              })
            }
          })
        }
      }
      // 处理元素的中文属性
      if (Array.isArray(element.attrsList)) {
        element.attrsList.forEach(attr => {
          if(attr.value.match(DOUBLE_BYTE_REGEX)) {
            let startPos = activeEditor.document.positionAt(attr.end - 1 - attr.value.length)
            let endPos = activeEditor.document.positionAt(attr.end - 1)
            let range = new vscode.Range(startPos, endPos)
            attr.range = new vscode.Range(activeEditor.document.positionAt(attr.start), activeEditor.document.positionAt(attr.end))
            matches.push({
              range,
              text: attr.value,
              isVueAttr: true,
              attr: attr
            })              
          }
        })
      }
      if (Array.isArray(element.children)) {
        visitVueAst(element.children)
      }
    });
  }
  visitVueAst(vueAst.children)
  // 2.查找script里面的代码的中文，利用上头的findTextInTs 加上一个偏移量
  let cpCode = code
  let scriptCode = cpCode.split(/\<\/*script\>/)[1]
  let scriptOffset = code.indexOf('<script>') + '<script>'.length // script里面代码的偏移量
  const ast = ts.createSourceFile(
    '',
    scriptCode,
    ts.ScriptTarget.ES2015,
    true,
    ts.ScriptKind.TSX
  );

  function visit(node: ts.Node) {
    switch(node.kind) {
      case ts.SyntaxKind.StringLiteral: {
        /** 判断 Ts 中的字符串含有中文 */
        const { text } = node as ts.StringLiteral;
        if (text.match(DOUBLE_BYTE_REGEX)) {
          const start = node.getStart();
          const end = node.getEnd();
          /** 加一，减一的原因是，去除引号 */
          const startPos = activeEditor.document.positionAt(scriptOffset + start + 1);
          const endPos = activeEditor.document.positionAt(scriptOffset + end - 1);
          const range = new vscode.Range(startPos, endPos);
          matches.push({
            range,
            text,
            isString: true,
            isVueJsx: true
          });
        }
        break;
      }
      case ts.SyntaxKind.JsxElement: {
        const { children } = node as ts.JsxElement;

        children.forEach(child => {
          if (child.kind === ts.SyntaxKind.JsxText) {
            const text = child.getText();
            /** 修复注释含有中文的情况，Angular 文件错误的 Ast 情况 */
            const noCommentText = removeFileComment(text, fileName);

            if (noCommentText.match(DOUBLE_BYTE_REGEX)) {
              const start = child.getStart();
              const end = child.getEnd();
              const startPos = activeEditor.document.positionAt(scriptOffset + start);
              const endPos = activeEditor.document.positionAt(scriptOffset + end);
              const { trimStart, trimEnd } = trimWhiteSpace(code, startPos, endPos);
              const range = new vscode.Range(trimStart, trimEnd);

              matches.push({
                range,
                text: text.trim(),
                isString: false,
                isVueJsx: true
              });
            }
          }
        });
        break;
      }
      case ts.SyntaxKind.TemplateExpression: {
        const { pos, end } = node;
        const templateContent = code.slice(pos, end);

        if (templateContent.match(DOUBLE_BYTE_REGEX)) {
          // @TODO: 逻辑待完善
        }
      }
    }

    ts.forEachChild(node, visit);
  }
  ts.forEachChild(ast, visit);

  return matches
}
/**
 * 递归匹配代码的中文
 * @param code
 */
export function findChineseText(code: string, fileName: string) {
  if (fileName.endsWith('.html')) {
    return findTextInHtml(code);
  } else if (fileName.endsWith('.vue')) {
    return findTextInVue(code, fileName)
  }
  return findTextInTs(code, fileName);  
}