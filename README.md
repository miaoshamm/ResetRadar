<p align="center">
  <img src="public/logo.svg" alt="ResetRadar 标志" width="96" height="96" />
</p>

# ResetRadar

御三家模型额度重置追踪面板的 React + TypeScript 前端示例。

> 品牌标志为蓝色雷达屏：同心扫描环与右上扫描扇区象征实时监测，屏上的白、绿、黄三个光点分别代表被追踪的御三家厂商。源文件为 `public/logo.svg`，另有 `public/favicon.svg`、`public/favicon.ico` 与多尺寸 PNG 图标供浏览器标签页和移动端主屏幕使用。

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
├── public/
│   ├── logo.svg / logo-192.png / logo-512.png
│   ├── favicon.svg / favicon.ico / favicon-32.png
│   ├── apple-touch-icon.png
│   └── site.webmanifest
└── src/
    ├── App.tsx
    ├── main.tsx
    └── index.css
```
