/**
 * @author linhuiw
 * @desc 插件主入口
 */
import * as vscode from 'vscode';
import * as _ from 'lodash';
import { getSuggestLangObj } from './getLangData';
import { I18N_GLOB_PATH, COMMON } from './const';
import { findAllI18N, findI18N } from './findAllI18N';
import { getCurrentDirI18NPath } from './utils';
import { triggerUpdateDecorations } from './chineseCharDecorations';
import { TargetStr } from './define';
import { getCurrentFileNameWithoutLanguageId,getCurrentPath } from './file';
import { replaceAndUpdateInVue } from './replaceAndUpdate';

/**
 * 主入口文件
 * @param context
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "kiwi-linter" is now active!');
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-i18n-linter.findAllI18N',
      findAllI18N
    )
  );
  let targetStrs: TargetStr[] = [];
  let finalLangObj = {};

  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    triggerUpdateDecorations((newTargetStrs) => {
      targetStrs = newTargetStrs;
    });
  }

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      'vscode-i18n-linter.findI18N',
      findI18N
    )
  );

  // 监听公共i18文件和当前文件夹下的i18n.js文件
  // 公共i18n
  const watcher = vscode.workspace.createFileSystemWatcher(I18N_GLOB_PATH);
  let dirI18nWatcher
  let subscriptions = []
  context.subscriptions.push(
    watcher.onDidChange(() => (finalLangObj = getSuggestLangObj()))
  );
  context.subscriptions.push(
    watcher.onDidCreate(() => (finalLangObj = getSuggestLangObj()))
  );
  context.subscriptions.push(
    watcher.onDidDelete(() => (finalLangObj = getSuggestLangObj()))
  );
  // 监听当前文件夹下的i18n
  watchCurrentI18NFile()
  finalLangObj = getSuggestLangObj();

  // 识别到出错时点击小灯泡弹出的操作
  const hasLightBulb = vscode.workspace
    .getConfiguration('vscode-i18n-linter')
    .get('enableReplaceSuggestion');
  if (hasLightBulb) {
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        [
          { scheme: 'file', language: 'typescriptreact' },
          { scheme: 'file', language: 'html' },
          { scheme: 'file', language: 'typescript' },
          { scheme: 'file', language: 'javascriptreact' },
          { scheme: 'file', language: 'javascript' },
          { scheme: 'file', language: 'vue' } // lla 添加对vue支持
        ],
        {
          provideCodeActions: function(document, range, context, token) {
            const targetStr = targetStrs.find(
              t => range.intersection(t.range) !== undefined
            );
            if (targetStr) {
              const sameTextStrs = targetStrs.filter(
                t => t.text === targetStr.text
              );
              const text = targetStr.text;

              const actions = [];
              for (const key in finalLangObj) {
                if (finalLangObj[key] === text) {
                  actions.push({
                    title: `抽取为 '${key}'`,
                    command: 'vscode-i18n-linter.extractI18N',
                    arguments: [
                      {
                        targets: sameTextStrs,
                        varName: key
                      }
                    ]
                  });
                }
              }
              return actions.concat([{
                title: `抽取为自定义变量（共${sameTextStrs.length}处）`,
                command: 'vscode-i18n-linter.extractI18N',
                arguments: [
                  {
                    targets: sameTextStrs
                  }
                ]
              },{
                title: `抽取为公共变量${COMMON}.XXX`,
                command: 'vscode-i18n-linter.extractI18N',
                arguments: [
                  {
                    targets: sameTextStrs,
                    isCommon: true // 抽取为公共变量
                  }
                ]
              }]);
            }
          }
        }
      )
    );
  }

  // 点击小灯泡后进行替换操作
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-i18n-linter.extractI18N', args => {
      return new Promise(resolve => {
        // 若变量名已确定则直接开始替换
        if (args.varName) {
          return resolve(args.varName);
        }
        let moduleName
        if (args.isCommon) {
          moduleName = COMMON
        } else {
          moduleName = getCurrentFileNameWithoutLanguageId()
          if (moduleName == 'index') {
            let path = getCurrentPath()
            let paths = path.split('\\')
            let name = ''
            name += paths.pop().replace(/( |^)[a-z]/g, function(s) {
              return s.toUpperCase()
            })
            name = paths.pop() + name
            moduleName = name
          }
        }
        // 否则要求用户输入变量名
        return resolve(
          vscode.window.showInputBox({
            prompt:
              '请输入变量名，格式 `[ModulefileName].[key]`，按 <回车> 启动替换',
            value: `${moduleName}.`,
            validateInput(input) {
              if (!input.match(/\w+\.\w+/)) {
                return '变量名，格式 `[ModulefileName].[key]`';
              }
            }
          })
        );
      }).then((val: string) => {
        // 没有输入变量名
        if (!val) {
          return;
        }
        const finalArgs = Array.isArray(args.targets)
          ? args.targets
          : [args.targets];
        if (finalLangObj[val] !== undefined && finalLangObj[val] !== finalArgs[0].text) {
          vscode.window.showInformationMessage(`${val}已经存在，值为${finalLangObj[val]}`);
          return
        }          
        return finalArgs
          .reduce((prev: Promise<any>, curr: TargetStr, index: number) => {
            return prev.then(() => {
              let isExsit = finalLangObj[val] // 是否在旧的文件中已经存在翻译了
              return replaceAndUpdateInVue(
                curr,
                val,
                isExsit
              );
            });
          }, Promise.resolve())
          .then(() => {
            vscode.window.showInformationMessage(
              `成功替换 ${finalArgs.length} 处文案`
            );
          }, (err) => {
            console.log(err, 'err');
          });
      });
    })
  );

  // 当 切换文档 的时候重新检测当前文档中的中文文案
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      activeEditor = editor;
      if (editor) {
        // 重新监听 当前文件夹下的i18n变化
        disposeCurrentI18NFileWatch()
        watchCurrentI18NFile()
        finalLangObj = getSuggestLangObj();
        triggerUpdateDecorations((newTargetStrs) => {
          targetStrs = newTargetStrs;
        });
      }
    }, null)
  );

  // 当 文档发生变化时 的时候重新检测当前文档中的中文文案
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations((newTargetStrs) => {
          targetStrs = newTargetStrs;
        });
      }
    }, null)
  );
  /**
   * 监听当前文件夹下的i18n文件
   */
  function watchCurrentI18NFile () {
    dirI18nWatcher = vscode.workspace.createFileSystemWatcher(getCurrentDirI18NPath());
    let changWatcher = context.subscriptions.push(
      dirI18nWatcher.onDidChange(() => (finalLangObj = getSuggestLangObj()))
    );
    let createWatcher = context.subscriptions.push(
      dirI18nWatcher.onDidCreate(() => (finalLangObj = getSuggestLangObj()))
    );
    let deleteWatcher = context.subscriptions.push(
      dirI18nWatcher.onDidDelete(() => (finalLangObj = getSuggestLangObj()))
    );
    subscriptions.push(...[changWatcher, createWatcher, deleteWatcher])
    return dirI18nWatcher
  }
  // dispose 这个文件监听
  function disposeCurrentI18NFileWatch () {
    try {
      subscriptions.forEach(watcher => {
        watcher.dipose()
      })
      dirI18nWatcher.dipose()
      subscriptions = []
    } catch (error) {
      
    }
  }  
}