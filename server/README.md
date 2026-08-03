# 魔云腾后端服务

放在前端和魔云腾服务器（Docker Engine API）之间的中间层。
浏览器不能直接调 2375 端口（CORS 限制 + 安全隐患），所以要过这一层。

## 启动

```bash
cd server
npm install
cp .env.example .env   # 改里面的 MYT_HOST / MYT_PORT / API_TOKEN
npm run dev
```

默认监听 `http://localhost:4520`

## 鉴权

所有 `/api/*` 都需要在请求头里带：

```
Authorization: Bearer <API_TOKEN>
```

`API_TOKEN` 在 `.env` 里配置，前端也要填同样的值。

## 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET  | /health                          | 健康检查 |
| GET  | /api/config                      | 读取服务器连接配置 |
| PUT  | /api/config                      | 修改连接配置（host/port/tls/证书） |
| GET  | /api/connection/test             | 测试当前配置能否连通魔云腾 |
| GET  | /api/devices                     | 列出所有云手机（容器） |
| POST | /api/devices                     | 创建并启动一台云手机 `{image, name}` |
| POST | /api/devices/:id/start           | 启动指定云手机 |
| POST | /api/devices/:id/stop            | 停止指定云手机 |
| POST | /api/devices/:id/restart         | 重启指定云手机 |
| DELETE | /api/devices/:id               | 删除指定云手机 |
| POST | /api/devices/batch               | 批量启停 `{ids, action: start\|stop\|restart}` |
| GET  | /api/images                      | 列出本地镜像 |
| POST | /api/images/pull                 | 拉取镜像（SSE 流式返回进度）`{image}` |

## 安全提示

- 不要把 2375 端口直接暴露在公网
- 前端不要直接连 2375，必须经由本服务
- 生产环境请把 2375 换成 2376 + TLS 证书
