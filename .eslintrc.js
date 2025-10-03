// 文件名: .eslintrc.js

module.exports = {
  // 'root: true' 标志，告诉 ESLint 不要再向上层目录寻找配置文件
  root: true,

  // 定义代码运行的环境
  env: {
    browser: true, // 支持浏览器全局变量
    node: true,    // 支持 Node.js 全局变量和语法
    es2021: true,  // 启用 ES2021 语法
  },

  // 继承一系列预设的规则集
  extends: [
    'eslint:recommended',         // 启用 ESLint 官方推荐的核心规则
    'plugin:vue/vue3-essential',  // 启用 Vue3 的基本规则，防止错误
    'prettier',                   // 【关键】禁用与 Prettier 冲突的 ESLint 样式规则
  ],

  // 指定用于解析代码的解析器
  parser: '@babel/eslint-parser',
  
  // 解析器选项
  parserOptions: {
    ecmaVersion: 'latest', // 使用最新的 ECMAScript 版本
    sourceType: 'module',  // 代码是 ECMAScript 模块
    requireConfigFile: false, // HBuilderX 项目可能没有 babel.config.js，所以关闭此检查
  },
  
  // 注册插件
  plugins: [
    'vue',      // vue 插件
    'prettier', // prettier 插件
  ],

  // 自定义规则 (在这里可以覆盖或添加规则)
  // "off" 或 0 - 关闭规则
  // "warn" 或 1 - 开启规则，使用警告级别的错误 (不会导致程序退出)
  // "error" 或 2 - 开启规则，使用错误级别的错误 (当被触发时，程序会退出)
  rules: {
    // 【关键】将 prettier 规则作为 ESLint 错误来提示
    'prettier/prettier': 'error',

    // 示例：在开发环境中，允许使用 console.log，但在生产环境中会警告
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',

    // 示例：关闭对未使用变量的检查（如果需要的话，但不推荐）
    // 'no-unused-vars': 'off'
  },
};