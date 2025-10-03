// 文件名: .prettierrc.js

module.exports = {
  // 每行最大字符数，超过会换行
  printWidth: 120,
  
  // 使用单引号而不是双引号
  singleQuote: true,

  // 在对象或数组的末尾添加逗号 (es5表示在ES5有效的地方加)
  trailingComma: 'es5',

  // 在语句末尾添加分号
  semi: true,

  // 使用 2 个空格进行缩进
  tabWidth: 2,

  // 对象大括号内侧是否需要空格 { foo: bar }
  bracketSpacing: true,

  // JSX 标签的闭合括号是否与标签名在同一行
  jsxBracketSameLine: false,

  // 箭头函数，只有一个参数时，是否需要括号
  arrowParens: 'always',
};