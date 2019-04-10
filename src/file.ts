/**
 * @author linhuiw
 * @desc 文件相关操作
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as prettier from 'prettier';
import {  COMMON, SEP, I18N_GLOB_PATH, commonLangObj, dirLangObj } from './const';

// 更新语言包
export function updateVueLangFiles(keyName: string, text: string) {
  // \n 会被自动转义成 \\n，这里转回来
  text = text.replace(/\\n/gm, '\n');  
  if (keyName.startsWith(`${COMMON}`)) {
    let dirs = I18N_GLOB_PATH.split(SEP)
    dirs.pop()
    let globalDirPath = dirs.join(SEP)
    if (!fs.existsSync(globalDirPath) || !fs.existsSync(I18N_GLOB_PATH)) {
      fs.mkdirpSync(globalDirPath) // 创建文件夹
      fs.writeFileSync(I18N_GLOB_PATH, getNewGlobalLanguageFileContent())
      vscode.window.showInformationMessage(`成功新建语言文件 ${I18N_GLOB_PATH}`);
    }
    updateGlobalLanguageFile(keyName, text)
  } else {
    let currentDirI18nPath = getCurrentPath() + SEP + 'i18n.js'
    if (!fs.existsSync(currentDirI18nPath)) {
      fs.writeFileSync(currentDirI18nPath, getDirLanguageFileContent())
      vscode.window.showInformationMessage(`成功新建语言文件 ${currentDirI18nPath}`);
    }
    updateDirLanguageFile(keyName, text) 
  }
}
/**
 * 获取对应目录下的语言包对象
 * @param  {string} fileName
 */
function getI18N (fileName: string) {
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
  return jsObj
}

/**
 * 更新全局的语言包
 * @param  {string} keyName
 * @param  {string} text
 */
export function updateGlobalLanguageFile (keyName: string, text: string) {
  let currentLangObj = getI18N(I18N_GLOB_PATH) as any
  // 只更新zh_CN里面的键值
  let moduleKeys = keyName.split('.')
  let moduleName = moduleKeys[0]
  let realKey = moduleKeys[1]
  if (!currentLangObj.zh_CN[moduleName]) {
    currentLangObj.zh_CN[moduleName] = {}
  }
  currentLangObj.zh_CN[moduleName][realKey] = text
  fs.writeFileSync(I18N_GLOB_PATH, getNewGlobalLanguageFileContent(currentLangObj))
}

/**
 * 生成公共语言包的文件内容
 * @param  {Object} newLangObject?
 */
function getNewGlobalLanguageFileContent (newLangObject?: Object) {
  let langObject
  if (newLangObject) {
    langObject = newLangObject
  } else {
    langObject = commonLangObj
  }
  let fileContent = `const i18n = ${JSON.stringify(langObject, null, 2)}
export default i18n`
  return prettierFile(fileContent)
}

/**
 * 更新当前文件夹下面的i18n文件的内容
 * @param  {string} keyName 
 * @param  {string} text
 */
export function updateDirLanguageFile (keyName: string, text: string) {
  let currentDirI18nPath = getCurrentPath() + SEP + 'i18n.js'
  let currentLangObj = getI18N(currentDirI18nPath) as any
  // 只更新zh_CN里面的键值
  let moduleKeys = keyName.split('.')
  let moduleName = moduleKeys[0]
  let realKey = moduleKeys[1]
  if (!currentLangObj.zh_CN[moduleName]) {
    currentLangObj.zh_CN[moduleName] = {}
  }
  currentLangObj.zh_CN[moduleName][realKey] = text
  fs.writeFileSync(currentDirI18nPath, getDirLanguageFileContent(currentLangObj))
}

/**
 * 返回目录级别的语言包文件的内容
 * @param  {Object} newLangObject? 新的语言包对象 不然就用默认的
 */
function getDirLanguageFileContent (newLangObject?: Object) {
  let langObject
  if (newLangObject) {
    langObject = newLangObject
  } else {
    langObject = dirLangObj
  }
  let fileContent = `import { i18nMerge } from '@\/plugins\/i18n'
const i18n = ${JSON.stringify(langObject, null, 2)}
i18nMerge(i18n)`
  return prettierFile(fileContent)
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
 * 使用 Prettier 格式化文件
 * @param fileContent
 */
function prettierFile(fileContent) {
  try {
    return prettier.format(fileContent, {
      parser: 'typescript',
      trailingComma: 'all',
      singleQuote: true
    });
  } catch (e) {
    console.error(`代码格式化报错！${e.toString()}\n代码为：${fileContent}`);
    return fileContent;
  }
}