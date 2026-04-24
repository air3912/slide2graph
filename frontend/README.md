# slide2graph frontend

这是 slide2graph 的前端可视化页面。

## 启动方式

在 `frontend` 目录下执行：

```powershell
npm install
npm run dev
```

默认会在 `http://localhost:5173` 打开。

## 页面功能

- 上传 PDF 后默认调用后端 `/api/v1/pdf/extract-text`
- 可切换到 `/api/v1/pdf/analyze`，但该接口需要后端配置好 LLM
- 展示 PDF 原文提取结果
- 展示 LLM 返回的 summary
- 将知识图谱渲染为可视化网络图

## 开发说明

Vite 已配置 `/api` 代理到 `http://127.0.0.1:8000`，所以本地联调时先启动后端，再启动前端即可。