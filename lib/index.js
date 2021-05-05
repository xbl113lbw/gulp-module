
/**
 * watch("路径"，"任务") 自动监视一个文件路径的通配符，根据文件变化去决定是否重新执行编译任务
 */
const { src, dest, parallel, series, watch } = require('gulp')

// 文件清除插件
const del = require('del')
const browserSync = require('browser-sync')

// 自动加载所有插件（必须是gulp的插件）
const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()
const bs = browserSync.create()

// 返回命令行当前的工作目录
const cwd = process.cwd()

let config = {
  // 默认配置
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'assets/fonts/**'
    }
  }
}

try {
  const loadConfig = require(`${cwd}/pages.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (e) { }

// clean 任务，自动清除 dist 下的文件
const clean = () => {
  return del([config.build.dist, config.build.temp])
}

// 样式编译任务
const style = () => {
  // 选项 base 是基准路径，输出时可以保留基准路径（本例为src）后面的文件路径格式
  // cwd 工作目录，查找 src() 的基准路径，默认是当前的项目目录，此处指定为 src
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 脚本编译任务
const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
  // 此处使用 require 加载插件是因为字符串的形式，在实际项目中的依赖（node_modules）中会找不到
  // 使用 require 就可以在工作流模块中加载到
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 页面模板编译
const page = () => {
  // src 下任意目录的 html 文件
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data, caches: false })) // caches选项用于清除缓存
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

// 图片文件压缩
const image = () => {
  // ** 通配下面所有的文件
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

// 字体文件处理
const font = () => {
  // ** 通配下面所有的文件
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
  // 此处只是为了压缩字体文件下的svg
  // 如果格式不支持，imagemin 不会处理
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

// 额外的文件(如 public 下)
const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}

const serve = () => {
  watch(config.build.paths.styles, { cwd: config.build.src }, style)
  watch(config.build.paths.scripts, { cwd: config.build.src }, script)
  watch(config.build.paths.pages, { cwd: config.build.src }, page)

  // 开发阶段，监视src目录下图片等资源的变化，通过 bs.reload 刷新浏览器
  watch([config.build.paths.images, config.build.paths.fonts], { cwd: config.build.src }, bs.reload)
  watch('**', { cwd: config.build.public }, bs.reload)

  // 初始化开发服务器的配置
  bs.init({
    // 提示
    notify: false,
    // 端口
    port: 2080,
    // 是否自动打开浏览器,默认就是 true
    open: true,
    // 指定什么文件变化后自动更新 (也可以通过 bs.reload 实现)
    // files: "dist/**",
    server: {
      // 根目录，但是数组时，接收到一个请求时，会先去第一个目录去找，找不到的情况下依次往后寻找
      baseDir: [config.build.temp, config.build.src, config.build.public],
      // 路由，优先级高于 baseDir
      routes: {
        '/node_modules': 'node_modules'
      }
    }
  })
}

// 处理文件的引用
const useref = () => {
  // gulp-useref 插件，解决文件引用的问题（比如压缩文件中 node_modules 当中的引用）
  // 会去查找构建注释，格式例子查看 annotation 文件
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
  // html css js 的压缩工作 (gulp-htmlmin gulp-clean-css gulp-uglify)
  // html 压缩需要额外的参数配置
  // 由于此处需要根据不同的文件类型去做不同的处理，需要另外一个插件 gulp-if
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
  // 此处不是 dist 是为了防止一边写入一边读取造成冲突
  // .pipe(dest("release"))
    .pipe(dest(config.build.dist))
}

// 创建组合任务，组合样式、脚本、页面、图片、字体任务（src 文件目录）
// 开发阶段，为了效率考虑，无需每次都将图片之类的静态资源进行编译，在上线之前编译压缩即可
// const compile = parallel(style, script, page, image, font);
const compile = parallel(style, script, page)

// 上线之前
const build = series(clean, parallel(series(compile, useref), image, font, extra))

// 开发阶段
const develop = series(compile, serve)

module.exports = {
  develop,
  build,
  clean
}
