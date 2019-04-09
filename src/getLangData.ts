/**
 * @author linhuiw
 * @desc 获取语言文件
 */
import * as vscode from 'vscode';
import { flatten } from './utils';
import * as globby from 'globby';
import * as fs from 'fs-extra';
import { I18N_GLOB_PATH } from './const';
/**
 * 获取文件 Json
 */
function getLangJson(fileName) {
  const fileContent = fs.readFileSync(fileName, { encoding: 'utf8' });
  let obj = fileContent.match(/const\s*i18n\s*=\s*({[\s\S]*})/)[1];
  obj = obj.replace(/\s*;\s*$/, '')
  let jsObj = {};
  try {
    jsObj = eval("(" + obj + ")");
  } catch (err) {
    console.log(obj);
    console.error(err);
  }
  if ((jsObj as any).zh_CN) {
    return (jsObj as any).zh_CN
  } else {
    return {}
  }
}
/**
 * 获取对应文件的语言
 */
export function getLangData(fileName: string) {
  if (fs.existsSync(fileName)) {
    return getLangJson(fileName);
  } else {
    return {};
  }
}
export function getI18N() {
  const paths = globby.sync(I18N_GLOB_PATH);
  const langObj = paths.reduce((prev, curr) => {
    const filename = curr
      .split('/')
      .pop()
      .replace(/\.tsx?$/, '');
    if (filename.replace(/\.tsx?/, '') === 'index') {
      return prev;
    }

    const fileContent = getLangData(curr);
    let jsObj = fileContent;

    if (Object.keys(jsObj).length === 0) {
      vscode.window.showWarningMessage(
        `\`${curr}\` 解析失败，该文件包含的文案无法自动补全`
      );
    }

    if (filename === 'common') {
      return {
        ...prev,
        ...jsObj
      };
    }
    return {
      ...prev,
      [filename]: jsObj
    };
  }, {});
  return langObj;
}
export function getDirI18N (fileName: string) {
  if (fs.existsSync(fileName)) {
    return getLangJson(fileName);
  } else { // 不存在就创建
    return {}
  }
}
function getCommonI18N () {
  if (fs.existsSync(I18N_GLOB_PATH)) {
    return getLangJson(I18N_GLOB_PATH)
  } else {
      return {}
  }
}

/**
 * 获取全部语言, 展平
 */
export function getSuggestLangObj() {
  let activeEditor = vscode.window.activeTextEditor;
  let currentFileSplits = activeEditor.document.fileName.split('\\');
  currentFileSplits.pop()
  currentFileSplits.push('i18n.js')
  const dirI18nPath  = currentFileSplits.join('\\') // 拿到当前文件夹下的i18n.js路径
  const langObj = {
    ...getDirI18N(dirI18nPath),
    ...getCommonI18N()
  }
  const finalLangObj = flatten(langObj) as any;
  return finalLangObj;
}
