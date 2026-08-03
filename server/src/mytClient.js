// 魔云腾 Docker Engine API 客户端
// 支持 2375（明文）和 2376（TLS）两种模式
// 接口说明：https://docs.docker.com/engine/api/

import http from 'node:http'
import https from 'node:https'
import { URL } from 'node:url'

const API_VERSION = 'v1.41'

/**
 * 构造一个 Docker 客户端
 * @param {object} opts
 * @param {string} opts.host  魔云腾服务器 IP
 * @param {number} opts.port  端口（2375 / 2376）
 * @param {boolean} opts.tls  是否使用 TLS
 * @param {string} [opts.ca]
 * @param {string} [opts.cert]
 * @param {string} [opts.key]
 */
export function createMytClient(opts) {
  const { host, port, tls = false, ca, cert, key } = opts

  if (!host || !port) {
    throw new Error('魔云腾服务器地址未配置（host/port 不能为空）')
  }

  const agent = tls
    ? new https.Agent({
        host,
        port,
        ca: ca ? Buffer.from(ca) : undefined,
        cert: cert ? Buffer.from(cert) : undefined,
        key: key ? Buffer.from(key) : undefined,
        // 没有证书时跳过校验（仅本地调试用）
        rejectUnauthorized: Boolean(ca && cert && key),
      })
    : new http.Agent({ host, port })

  /**
   * 通用请求方法
   * @param {string} method  HTTP 方法
   * @param {string} path    路径，例如 /containers/json
   * @param {object} [options]
   * @param {object} [options.query]  查询参数
   * @param {object} [options.body]   JSON body
   * @param {object} [options.headers]
   */
  function request(method, path, { query, body, headers = {} } = {}) {
    return new Promise((resolve, reject) => {
      const qs = query
        ? '?' + new URLSearchParams(
            Object.entries(query).filter(([, v]) => v !== undefined && v !== null)
          ).toString()
        : ''

      const reqOptions = {
        host,
        port,
        method,
        path: `/${API_VERSION}${path}${qs}`,
        agent,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      }

      const lib = tls ? https : http
      const req = lib.request(reqOptions, (res) => {
        let chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8')
          if (res.statusCode >= 200 && res.statusCode < 300) {
            // 容器日志等可能是空 body
            if (!text) return resolve(null)
            try {
              resolve(JSON.parse(text))
            } catch {
              resolve(text)
            }
          } else {
            reject(new Error(`Docker API ${res.statusCode}: ${text}`))
          }
        })
      })

      req.on('error', reject)
      req.setTimeout(15000, () => {
        req.destroy(new Error('请求魔云腾服务器超时（15s）'))
      })

      if (body) req.write(JSON.stringify(body))
      req.end()
    })
  }

  return {
    host,
    port,
    tls,
    /** 测试连通性 */
    async ping() {
      return request('GET', '/_ping')
    },
    /** 列出所有容器（云手机） */
    async listContainers({ all = true } = {}) {
      return request('GET', '/containers/json', { query: { all } })
    },
    /** 启动容器 */
    async startContainer(id) {
      return request('POST', `/containers/${encodeURIComponent(id)}/start`)
    },
    /** 停止容器 */
    async stopContainer(id, { timeout = 10 } = {}) {
      return request('POST', `/containers/${encodeURIComponent(id)}/stop`, { query: { t: timeout } })
    },
    /** 重启容器 */
    async restartContainer(id, { timeout = 10 } = {}) {
      return request('POST', `/containers/${encodeURIComponent(id)}/restart`, { query: { t: timeout } })
    },
    /** 创建并启动容器（拉起一台新云手机） */
    async createContainer({ image, name, env = [], exposedPorts = {} }) {
      return request('POST', '/containers/create', {
        query: { name },
        body: { Image: image, Env: env, ExposedPorts: exposedPorts },
      })
    },
    /** 删除容器 */
    async removeContainer(id, { force = false } = {}) {
      return request('DELETE', `/containers/${encodeURIComponent(id)}`, { query: { force } })
    },
    /** 列出本地镜像 */
    async listImages() {
      return request('GET', '/images/json')
    },
    /** 拉取镜像（流式，前端用 SSE 拿进度） */
    pullImageStream(image) {
      const qs = new URLSearchParams({ fromImage: image }).toString()
      const reqOptions = {
        host,
        port,
        method: 'POST',
        path: `/${API_VERSION}/images/create?${qs}`,
        agent,
        headers: { 'Content-Type': 'application/json' },
      }
      return (tls ? https : http).request(reqOptions)
    },
  }
}
