// 魔云腾后端服务入口
// 作用：作为浏览器与多台魔云腾服务器之间的中间层
//   1) 解决浏览器 CORS 跨域问题
//   2) 统一鉴权
//   3) 支持同时管理多台魔云腾服务器（每台一个 Docker Engine）
//   4) 避免把 2375 明文端口暴露到前端
//
// 启动：cd server && npm install && npm run dev
// 默认监听 4520 端口

import express from 'express'
import cors from 'cors'
import http from 'node:http'
import 'dotenv/config'

import { createMytClient } from './mytClient.js'
import { registerRoutes } from './routes.js'

const PORT = parseInt(process.env.PORT || '4521', 10)
const API_TOKEN = process.env.API_TOKEN || 'myt-cloud-phone-2026'

// 多服务器连接池：Map<serverId, { id, label, config, client }>
const serverPool = new Map()
let serverIdCounter = 0

function getClient(serverId) {
  const entry = serverPool.get(serverId)
  if (!entry) throw new Error(`服务器 ${serverId} 不存在`)
  if (!entry.client) entry.client = createMytClient(entry.config)
  return entry.client
}

function resetClient(serverId) {
  const entry = serverPool.get(serverId)
  if (entry) entry.client = null
}

function addServer({ id, label, host, port, tls, mode = 'docker', username, password }) {
  const serverId = id || `srv_${++serverIdCounter}`
  const entry = {
    id: serverId,
    label: label || host,
    config: { host, port: parseInt(port, 10) || (mode === 'sdk' ? 8000 : 2375), tls: Boolean(tls), mode, username, password },
    client: null,
  }
  serverPool.set(serverId, entry)
  resetClient(serverId)
  return { id: entry.id, label: entry.label, host: entry.config.host, port: entry.config.port, tls: entry.config.tls, mode: entry.config.mode }
}

function removeServer(serverId) {
  if (!serverPool.has(serverId)) throw new Error(`服务器 ${serverId} 不存在`)
  serverPool.delete(serverId)
}

function getServers() {
  return Array.from(serverPool.values()).map((e) => ({
    id: e.id,
    label: e.label,
    host: e.config.host,
    port: e.config.port,
    tls: e.config.tls,
    mode: e.config.mode || 'docker',
    hasCredentials: !!(e.config.username && e.config.password),
  }))
}

function getServerConfig(serverId) {
  const entry = serverPool.get(serverId)
  if (!entry) throw new Error(`服务器 ${serverId} 不存在`)
  return entry.config
}

// 从环境变量加载初始服务器（可选）
if (process.env.MYT_HOST) {
  addServer({
    label: process.env.MYT_LABEL || '默认服务器',
    host: process.env.MYT_HOST,
    port: process.env.MYT_PORT || '2375',
    tls: process.env.MYT_TLS === 'true',
  })
}

// 预设 SDK 服务器（环境变量未指定时自动加载）
if (serverPool.size === 0) {
  const defaultServers = [
    { id: 'srv_104', label: '云手机-104', host: '192.168.9.104', port: 8000, mode: 'sdk' },
    { id: 'srv_106', label: '云手机-106', host: '192.168.9.106', port: 8000, mode: 'sdk' },
    { id: 'srv_105', label: '云手机-105', host: '192.168.9.105', port: 8000, mode: 'sdk' },
    { id: 'srv_107', label: '云手机-107', host: '192.168.9.107', port: 8000, mode: 'sdk' },
    { id: 'srv_109', label: '云手机-109', host: '192.168.9.109', port: 8000, mode: 'sdk' },
  ]
  for (const s of defaultServers) {
    addServer(s)
  }
}

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'cloud-phone-backend', servers: serverPool.size, time: new Date().toISOString() })
})

// 鉴权中间件
function authRequired(req, res, next) {
  const auth = req.headers['authorization'] || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()
  if (token !== API_TOKEN) {
    return res.status(401).json({ code: 401, message: '未授权：Token 不正确' })
  }
  next()
}

// 创建共享 HTTP 服务器（Express + WebSocket 共用）
const server = http.createServer(app)

registerRoutes(app, {
  authRequired,
  getClient,
  getServers,
  addServer,
  removeServer,
  resetClient,
  getServerConfig,
  serverPool,
  httpServer: server,
})

app.use((err, _req, res, _next) => {
  console.error('[后端错误]', err.message)
  res.status(500).json({ code: 500, message: err.message || '内部错误' })
})

server.listen(PORT, () => {
  console.log(`✅ 魔云腾后端服务已启动`)
  console.log(`   监听地址: http://localhost:${PORT}`)
  console.log(`   健康检查: http://localhost:${PORT}/health`)
  console.log(`   API 前缀: /api/*  （需要 Authorization: Bearer <token>）`)
  console.log(`   已配置服务器: ${serverPool.size} 台`)
  for (const s of serverPool.values()) {
    console.log(`   - ${s.label} (${s.id}): ${s.config.host}:${s.config.port} TLS=${s.config.tls}`)
  }
})