/**
 * @author linhuiw
 * @desc 更新文件
 */

import { TargetStr } from "./define";
import * as vscode from 'vscode';
import { updateVueLangFiles } from "./file";
import { COMMON, I18N_GLOB_PATH } from './const'

export function replaceAndUpdateInVue (
  targetStr: TargetStr,
  keyName: string,
  isExsit: boolean
) {
  const edit = new vscode.WorkspaceEdit();
  const { document } = vscode.window.activeTextEditor;
  let finalReplaceVal = `$t('${keyName}')`
  let start = targetStr.range.start.translate(0, -1)
  let end = targetStr.range.end.translate(0, 1)
   // vue的script中需要加this
  if (targetStr.isVueJsx) {
    finalReplaceVal=`this.$t('${keyName}')`
  }
  // vue Template中的需要加 {{ }}
  if (targetStr.isTemplatePureString) {
    start = targetStr.range.start
    end = targetStr.range.end
    finalReplaceVal = `{{$t('${keyName}')}}`
  }
  // vue的template中的属性
  if (targetStr.isVueAttr) {
    finalReplaceVal = `:${targetStr.attr.name}="$t('${keyName}')"`
    start = targetStr.attr.range.start
    end = targetStr.attr.range.end
  }

  if (targetStr.isVueDirective) {
    // todo
  }
  edit.replace(
    document.uri,
    targetStr.range.with({
      start: start,
      end: end
    }),
    finalReplaceVal
  );
    try {
    // 更新语言文件
    if (!isExsit) { // 如果原先的文件中已经有键值了就不需要再更新了
      updateVueLangFiles(keyName, targetStr.text);
    }
    // 若更新成功再替换代码
    return vscode.workspace.applyEdit(edit);
    } catch (err) {
      console.log(err)
    }
  }
