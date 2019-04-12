/**
 * @author linhuiw
 * @desc 工具方法
 */
import * as _ from 'lodash';
import * as vscode from 'vscode';
import { SEP} from './const';
/**
 * 将对象拍平
 * @param obj    原始对象
 * @param prefix
 */
export function flatten(obj, prefix?) {
  var propName = prefix ? prefix + '.' : '',
    ret = {};

  for (var attr in obj) {
    if (_.isArray(obj[attr])) {
      var len = obj[attr].length;
      ret[attr] = obj[attr].join(',');
    } else if (typeof obj[attr] === 'object') {
      _.extend(ret, flatten(obj[attr], propName + attr));
    } else {
      ret[propName + attr] = obj[attr];
    }
  }
  return ret;
}

/**
 * 查找当前位置的 Code
 */
export function findPositionInCode(text: string, code: string) {
  const lines = code.split('\n');
  const lineNum = lines.findIndex(line => line.includes(text));

  if (lineNum === -1) {
    return null;
  }

  let chNum = lines[lineNum].indexOf(text);

  if (text.startsWith(' ')) {
    chNum += 1;
  }

  return new vscode.Position(lineNum, chNum);
}

export function findMatchKey(langObj, text) {
  for (const key in langObj) {
    if (langObj[key] === text) {
      return key;
    }
  }

  return null;
}


/**
 * 获取当前的文件名，比如 C:\a\b\c\ddd.vue 就是返回ddd
 */
export function getCurrentFileNameWithoutLanguageId () {
  let activeEditor = vscode.window.activeTextEditor;
  let currentFileSplits = activeEditor.document.fileName.split(SEP);
  let fileName = currentFileSplits.pop()
  return fileName.split('.')[0] // 返回去除.后缀文件类型的文件名
}

/**
 * 获取当前的文件所处的文件夹路径 比如 C:\a\b\c\ddd.vue 就是返回C:\a\b\c
 */
export function getCurrentPath () {
  let activeEditor = vscode.window.activeTextEditor;
  let currentFileSplits = activeEditor.document.fileName.split(SEP);
  currentFileSplits.pop()
  return currentFileSplits.join(SEP)
}

/**
 * 获取当前的文件所处的文件夹路径 比如 C:\a\b\c\ddd.vue 就是返回C:\a\b\c
 */
export function getCurrentDirI18NPath () {
  let activeEditor = vscode.window.activeTextEditor;
  let currentFileSplits = activeEditor.document.fileName.split(SEP);
  currentFileSplits.pop()
  currentFileSplits.push('i18n.js')
  const dirI18nPath  = currentFileSplits.join(SEP) // 拿到当前文件夹下的i18n.js路径
  return dirI18nPath
}