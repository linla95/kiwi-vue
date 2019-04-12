## 基于[阿里巴巴的国际化解决方案](https://github.com/nefe/kiwi)，目标是改造成vue项目下的国际化方案（vue-i18n）
目前支持的特性：
以当前的文件夹名为模块名抽离出对应的语言包
```
基础语言包
const i18n = {
  zh_CN: {
    base: {
      required: '不能为空！',
      save: '保存',
      cancel: '取消',
      sure: '确定',
      delete: '删除',
      all: '全部',
    },
  },
  en: {
    base: {
    }
  }
};
export default i18n;
```
```
各个模块语言包
import { i18nMerge } from '@/plugins/i18n';
const i18n = {
  zh_CN: {
    helloworld: {
      required: '不能为空！',
      save: '保存',
      cancel: '取消',
      sure: '确定',
      delete: '删除',
      all: '全部',
    },
  },
};
i18nMerge(i18n);
```