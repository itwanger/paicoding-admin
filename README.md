# paicoding-admin 🚀

## 介绍 📖

<p align="center">
  <a href="https://paicoding.com/">
    <img src="https://cdn.tobebetterjavaer.com/images/README/1681354262213.png" alt="技术派" width="400">
  </a>
</p>
🚀🚀🚀 paicoding-admin，技术派管理端，基于 React18、React-Router v6、React-Hooks、Redux、TypeScript、Vite3、Ant-Design 5.x、Hook Admin、ECharts 的一套社区管理系统，够惊艳哦。
<br><br>
<p align="center">
  <a href="https://paicoding.com/article/detail/15"><img src="https://img.shields.io/badge/技术派-学习圈子-green.svg?style=for-the-badge"></a>
  <a href="https://paicoding.com/" target="_blank"><img src="https://img.shields.io/badge/技术派-首页-critical?style=for-the-badge"></a>
  <a href="https://github.com/itwanger/paicoding-admin" target="_blank"><img src="https://img.shields.io/badge/技术派-管理端-yellow.svg?style=for-the-badge"></a>
  <a href="https://gitee.com/itwanger/paicoding-admin" target="_blank"><img src="https://img.shields.io/badge/码云-项目地址-blue.svg?style=for-the-badge"></a>
</p>

## 一、在线预览地址 👀

- Link：[https://paicoding.com/admin-view/](https://paicoding.com/admin-view/)

## 二、Git 仓库地址 (欢迎 Star⭐)

- GitHub：[https://github.com/itwanger/paicoding-admin](https://github.com/itwanger/paicoding-admin)
- 码云：[https://gitee.com/itwanger/paicoding-admin](https://gitee.com/itwanger/paicoding-admin)

## 三、🔨🔨🔨 项目功能

- 🚀 采用最新技术找开发：React18、React-Router v6、React-Hooks、TypeScript、Vite3
- 🚀 采用 Vite3 作为项目开发、打包工具（配置了 Gzip 打包、跨域代理、打包预览工具……）
- 🚀 整个项目集成了 TypeScript （学期来很酷哦 🤣）
- 🚀 使用 redux 做状态管理，集成 immer、react-redux、redux-persist 开发
- 🚀 使用 TypeScript 对 Axios 整个二次封装 （全局错误拦截、常用请求封装、全局请求 Loading、取消重复请求……）
- 🚀 支持 Antd 组件大小切换、暗黑 && 灰色 && 色弱模式
- 🚀 使用 自定义高阶组件 进行路由权限拦截（403 页面）、页面按钮权限配置
- 🚀 支持 React-Router v6 路由懒加载配置、菜单手风琴模式、无限级菜单、多标签页、面包屑导航
- 🚀 使用 Prettier 统一格式化代码，集成 Eslint、Stylelint 代码校验规范（项目规范配置）
- 🚀 使用 husky、lint-staged、commitlint、commitizen、cz-git 规范提交信息（项目规范配置）

## 四、安装使用步骤 📑

### Clone：

```text
# GitHub
git clone https://github.com/itwanger/paicoding-admin.git
```

### Install：

```text
npm install
cnpm install

# npm install 安装失败，请升级 nodejs 到 16 以上，或尝试使用以下命令：
npm install --registry=https://registry.npm.taobao.org

# npm install 如果出现 npm ERR! code ECONNRESET 错误，可尝试执行以下命令后再安装
npm config set registry http://registry.npmjs.org/
```

### Run：

```text
npm run dev
```

### Build：

```text
# 生产环境
npm run build:pro
```

## 五、项目截图

### 1、数据统计页（ECharts 真强大）：

![](https://cdn.tobebetterjavaer.com/stutymore/README-20230602150500.png)

### 2、运营配置页（Ant 的图片上传组件不错哦）：

![](https://cdn.tobebetterjavaer.com/stutymore/README-20230602150909.png)

### 3、文章管理页：

![](https://cdn.tobebetterjavaer.com/stutymore/README-20230602154026.png)

### 4、专栏配置页（自定义下拉框挺好玩的）：

![](https://cdn.tobebetterjavaer.com/stutymore/README-20230602154134.png)

![](https://cdn.tobebetterjavaer.com/stutymore/README-20230602154222.png)

### 5、教程配置页（防抖支持搜索的下拉框、自定义支持分页、搜索的下拉框不错哦）

![](https://cdn.tobebetterjavaer.com/stutymore/README-20230602154904.png)

![](https://cdn.tobebetterjavaer.com/stutymore/README-20230602155018.png)

## 六、文件资源目录 📚

```text
pacoding-admin
├─ .vscode                # vscode推荐配置
├─ public                 # 静态资源文件（忽略打包）
├─ src
│  ├─ api                 # API 接口管理
│  ├─ assets              # 静态资源文件
│  ├─ components          # 全局组件
│  ├─ config              # 全局配置项
│  ├─ enums               # 项目枚举
│  ├─ hooks               # 常用 Hooks
│  ├─ language            # 语言国际化
│  ├─ layouts             # 框架布局
│  ├─ routers             # 路由管理
│  ├─ redux               # redux store
│  ├─ styles              # 全局样式
│  ├─ typings             # 全局 ts 声明
│  ├─ utils               # 工具库
│  ├─ views               # 项目所有页面
│  ├─ App.tsx             # 入口页面
│  ├─ main.tsx            # 入口文件
│  └─ env.d.ts            # vite 声明文件
├─ .editorconfig          # 编辑器配置（格式化）
├─ .env                   # vite 常用配置
├─ .env.development       # 开发环境配置
├─ .env.production        # 生产环境配置
├─ .env.test              # 测试环境配置
├─ .eslintignore          # 忽略 Eslint 校验
├─ .eslintrc.js           # Eslint 校验配置
├─ .gitignore             # git 提交忽略
├─ .prettierignore        # 忽略 prettier 格式化
├─ .prettierrc.js         # prettier 配置
├─ .stylelintignore       # 忽略 stylelint 格式化
├─ .stylelintrc.js        # stylelint 样式格式化配置
├─ CHANGELOG.md           # 项目更新日志
├─ commitlint.config.js   # git 提交规范配置
├─ index.html             # 入口 html
├─ LICENSE                # 开源协议文件
├─ lint-staged.config     # lint-staged 配置文件
├─ package-lock.json      # 依赖包包版本锁
├─ package.json           # 依赖包管理
├─ postcss.config.js      # postcss 配置
├─ README.md              # README 介绍
├─ tsconfig.json          # typescript 全局配置
└─ vite.config.ts         # vite 配置
```

## 七、项目后台接口 🧩

> 依托于技术派项目，一个基于 Spring Boot、MyBatis-Plus、MySQL、Redis、ElasticSearch、MongoDB、Docker、RabbitMQ 等技术栈实现的社区系统，采用主流的互联网技术架构、全新的 UI 设计、支持一键源码部署，拥有完整的文章&教程发布/搜索/评论/统计流程等，代码完全开源，没有任何二次封装，是一个非常适合二次开发/实战的现代化社区项目 👍 。

- 网站首页：[https://paicoding.com/](https://paicoding.com/)
- 源码地址：[https://github.com/itwanger/paicoding](https://github.com/itwanger/paicoding)

## 八、生产环境部署

1、执行 `npm run build:pro`，生成 dist 目录

2、将 dist 目录上传到服务器的 `/home/admin/` 目录下

3、如果采用 Nginx 的话，请在 server 节点下进行 location 配置。

```
location ^~ /admin-view {
		alias /home/admin/dist/; # 根 目 录
		index index.html;
}
```

## 九、友情链接

- [toBeBetterjavaer](https://github.com/itwanger/toBeBetterJavaer) ：一份通俗易懂、风趣幽默的 Java 学习指南，内容涵盖 Java 基础、Java 并发编程、Java 虚拟机、Java 企业级开发、Java 面试等核心知识点。学 Java，就认准二哥的 Java 进阶之路 😄
- [paicoding](https://github.com/itwanger/paicoding) ：⭐️ 一款好用又强大的开源社区，基于 Spring Boot、MyBatis-Plus、MySQL、Redis、ElasticSearch、MongoDB、Docker、RabbitMQ 等主流技术栈，附详细教程，包括 Java、Spring、MySQL、Redis、微服务&分布式、消息队列等核心知识点。学编程，就上技术派 😁。

## 十、star 趋势图

[![Star History Chart](https://api.star-history.com/svg?repos=itwanger/paicoding-admin&type=Date)](https://star-history.com/#itwanger/paicoding-admin&Date)

## 十一、许可证

[Apache License 2.0](https://github.com/itwanger/paicoding/blob/main/License)

Copyright (c) 2022-2023 技术派（沉默王二、楼仔、一灰、小超）
