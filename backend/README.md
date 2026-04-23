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

## 3. 运行测试

在 backend 目录下执行：

pytest