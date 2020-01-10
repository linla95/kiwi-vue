## 基于[阿里巴巴的国际化解决方案](https://github.com/nefe/kiwi)，改造成vue项目下的国际化方案（vue-i18n）
### 我在此基础上所做的工作： 
1.对于vue文件的解析：
    利用官方的`vue-template-compiler`工具([npm地址](https://www.npmjs.com/package/vue-template-compiler))将vue文件解析为语法树，关键节点进行是否含有中文的判断，记录对应的位置，并入之前的检测逻辑
    
2.生成的文件的定制： 
    由于用的是vue-i8n的方案，所以对于生成的语言包文件和文件所在的位置会有所不同，所以和部分也是定制化的。
## 目前支持的特性：
以当前的文件夹名为模块名抽离出对应的语言包（这个根据每个公司的国际化方案的不同，可能不一定适用）
```
基础语言包
const i18n = {
  zh_CN: {
    base: {
      required: '不能为空！',
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
    }
  },
};
i18nMerge(i18n);
```
### 如果使用过程中发现有任何问题，欢迎联系我的邮箱：llauser@163.com
