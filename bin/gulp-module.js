#!/usr/bin/env node

// 命令行的参数可以通过 process.argv 去拿到
process.argv.push("--cwd");
process.argv.push(process.cwd());
process.argv.push("--gulpfile");
// require 是载入这个模块
// require.resolve 是找到这个模块所对应的路径
//.. 返回上一级目录（即项目根目录） 
// 会去寻找 package.json 下的 main 字段
// process.argv.push(require.resolve("../lib/index.js"));
process.argv.push(require.resolve(".."));

require("gulp/bin/gulp");