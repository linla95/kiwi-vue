/**
 * @author linhuiw
 * @desc 常量定义
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
let LANG_PREFIX = `${vscode.workspace.rootPath}\\src\\i18n`;
let I18N_GLOB_PATH = `${vscode.workspace.rootPath}\\src\\i18n\\common.js`;
let DOUBLE_BYTE_REGEX = /[^\x00-\xff]/g;
let COMMON = 'common'
if (fs.existsSync(`${vscode.workspace.rootPath}\\i18n.config.json`)) {
  let fileContent = fs.readFileSync(`${vscode.workspace.rootPath}\\i18n.config.json`, { encoding: 'utf8' })
  let config = eval("(" + fileContent + ")")
  I18N_GLOB_PATH = `${vscode.workspace.rootPath}${config.common.output}`;
  COMMON = config.common.key
}
let SEP = ''
if (process.platform.includes('win')) { // 判断当前的运行环境 只支持mac和windows
  SEP = '\\'
} else {
  SEP = '/'
}
const commonLangObj = {
  zh_CN: {
    [COMMON]: {
      
    }
  }
}
const dirLangObj = {
  zh_CN: {
  }
}
export {
  LANG_PREFIX,
  I18N_GLOB_PATH, // 国际化通用文件库的存放地址
  DOUBLE_BYTE_REGEX,
  SEP,
  COMMON, // 通用翻译的键
  commonLangObj,
  dirLangObj
};