/**
 * @author linhuiw
 * @desc TS 定义
 */
import * as vscode from 'vscode';

export interface Item {
  keys: string[];value: string;
}

// 扫描文档，通过正则匹配找出所有中文文案
// export interface TargetStr {
//   text: string;
//   range: vscode.Range;
//   isString: boolean;
// }

// 扫描文档，通过正则匹配找出所有中文文案
export interface TargetStr {
  text: string;
  range: vscode.Range;
  isString?: boolean;
  isVueJsx?: boolean; // script 里面的
  isTemplatePureString?: boolean; // template里面的纯字符
  isVueAttr?: boolean; // vue属性
  attr?: any;
  isVueDirective?: boolean; // vue 指令
}