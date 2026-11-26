# ResetRadar

御三家模型额度重置追踪面板的 React + TypeScript 前端示例。

## 环境要求

- Node.js 20.19+ 或 22.12+
- npm

## 启动开发环境

```bash
npm install
npm run dev
```

浏览器打开终端输出的地址，通常是 http://localhost:5173。

## 构建生产版本

```bash
npm run build
npm run preview
```

生产静态文件输出到 `dist/`，可部署到 Nginx 等静态 Web 服务器。

## 当前版本说明

- 当前为前端演示项目，使用内置示例数据。
- 刷新操作不代表真实数据同步；尚未接入 OpenAI、Google、Anthropic 的官方数据接口或社交平台采集服务。
- 示例帖子、重置时间、概率及互动数均用于界面演示，不应视为真实事件或官方数据。
- 概率是演示用的社区估算字段，不构成官方承诺。
- 主题偏好保存在浏览器 localStorage。
- 时间统一按 Asia/Shanghai（北京时间，UTC+8）显示。

## 项目结构

```text
reset-radar/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
└── src/
    ├── App.tsx
    ├── main.tsx
    └── index.css
```
