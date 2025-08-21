module.exports = {
  root: true,
  parserOptions: {
    // 设置为 "script" (默认)或"module"（如果你的代码是 ECMAScript 模块)
    sourceType: 'module',
    //emcaVersion用来指定你想要使用的 ECMAScript 版本
    ecmaVersion: 6,
    // 解析器
    parser: 'babel-eslint'
  },
  // eslint的环境
  env: {
    browser: true,
    node: true,
    es6: true
  },
  // 启用的规则，因为是用vue框架，所以建议用plugin:vue/essential和@vue/prettier，eslint:recommended是eslint本身的
  extends: ['plugin:vue/essential', 'eslint:recommended', '@vue/prettier'],
  // required to lint *.vue files
  plugins: ['html', 'vue'],
  // add your custom rules here
  rules: {
    semi: [0, 'always'], //强制语句分号结尾
    'arrow-parens': 0, //箭头函数用小括号括起来
    // 'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0,
    // 关键字前后空格
    'keyword-spacing': [
      2,
      {
        before: true,
        after: true
      }
    ],
    // 条件语句中赋值语句
    'no-cond-assign': 2,
    // 单行代码块两边加空格
    'block-spacing': [2, 'always'],
    // 键值对当中冒号与值之间要留空白
    'key-spacing': [
      2,
      {
        beforeColon: false,
        afterColon: true
      }
    ]
  }
};
