/**
 * credits https://github.com/nefe/vscode-toolkits/blob/master/src/findI18NPositions.ts
 */

import * as ts from 'typescript';
import * as vscode from 'vscode';
import * as _ from 'lodash';
import { getSuggestLangObj } from './getLangData';

class Cache {
  memories = [] as Array<{ code: string; positions: Position[] }>;
  addCache(code: string, positions: Position[]) {
    this.memories.push({
      code,
      positions
    });

    if (this.memories.length > 8) {
      this.memories.shift();
    }
  }
  getPositionsByCode(code: string) {
    const mem = this.memories.find(mem => mem.code === code);
    if (mem && mem.positions) {
      return mem.positions;
    }

    return false;
  }
}

const cache = new Cache();

export class Position {
  start: number;
  cn: string;
  code: string;
}

/** 使用正则匹配{{}} */
function getRegexMatches(I18N, code: string) {
  const lines = code.split(/\r\n|\r|\n/);
  const positions: Position[] = [];
  /** 匹配{{$t.}} */
  const reg = new RegExp(/\$t\(([^)]*)\)/);
  (lines || []).map((line, index) => {
    let matchs = line.match(reg)
    if (matchs) {
      let exps = line.match(reg)[1]
      if (exps) {
        exps = exps.split("'")[1]
        const position = new Position();
        const transformedCn = _.get(I18N, exps);
        if (transformedCn) {
          position.cn = transformedCn;
          (position as any).line = index;
          position.code = code;
          positions.push(position);
        }
      }      
    }
  });
  return positions;
}

/**
 * 查找 I18N 表达式
 * @param code
 */
export function findI18NPositions(code: string) {
  const cachedPoses = cache.getPositionsByCode(code);
  if (cachedPoses) {
    return cachedPoses;
  }

  const I18N = getSuggestLangObj();
  const positions = [] as Position[];

  const regexMatches = getRegexMatches(I18N, code);
  let matchPositions = positions.concat(regexMatches);
  matchPositions = _.uniqBy(matchPositions, (position: Position & {
    line: number
  }) => {
    return `${position.code}-${(position.line)}`;
  });

  cache.addCache(code, matchPositions);
  return matchPositions;
}
