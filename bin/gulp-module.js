#!/usr/bin/env node

// 命令行的参数可以通过 process.argv 去拿到

// 指定工作目录
process.argv.push('--cwd')
// process.cwd() 就是当前命令行所在的目录
process.argv.push(process.cwd())

// 指定 gulpfile  所在的路径
process.argv.push('--gulpfile')
// require 是载入这个模块
// require.resolve 是找到这个模块所对应的路径
// .. 返回上一级目录（即项目根目录）
// 会去寻找 package.json 下的 main 字段
// process.argv.push(require.resolve("../lib/index.js"));
process.argv.push(require.resolve('..'))


// gulp/bin/gulp 会去自动的执行 gulp-cli
require('gulp/bin/gulp')
