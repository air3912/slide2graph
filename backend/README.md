# slide2graph backend

这是 slide2graph 的 FastAPI 后端最小骨架。

## 1. 安装依赖

在 backend 目录下执行：

pip install -r requirements.txt

## 2. 启动开发服务

在 backend 目录下执行：

uvicorn app.main:app --reload

启动后可访问：

- 根路由: /
- 健康检查: /api/v1/health
- Swagger: /docs
- PDF 文本提取: /api/v1/pdf/extract-text
- PDF 知识图谱分析: /api/v1/pdf/analyze

## 3. 配置 LLM

如果你要让 PDF 内容继续发送给 LLM 并生成知识网络，需要配置一个 OpenAI 兼容接口：

- `LLM_API_BASE`
- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_CHAT_PATH`

示例：

```powershell
$env:LLM_API_BASE = "https://api.openai.com"
$env:LLM_API_KEY = "your-api-key"
$env:LLM_MODEL = "gpt-4o-mini"
```

注意：修改 `.env` 后请重启后端进程，否则已经启动的 Uvicorn 仍会使用旧配置。

## 4. 运行测试

在 backend 目录下执行：

pytest