// 前端 API 封装层 —— 多服务器版
// 所有请求都走后端（开发期走 Vite 代理，生产期走相对路径同源）

const STORAGE_KEY = 'myt-backend-config'

function getConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* 忽略 */ }
  return { token: 'myt-cloud-phone-2026' }
}

function saveConfig(cfg) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
}

function getToken() { return getConfig().token }

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = text ? JSON.parse(text) : null } catch { data = text }
  if (!res.ok) {
    const msg = (data && data.message) || res.statusText || '请求失败'
    throw new Error(`${res.status} ${msg}`)
  }
  return data
}

export const api = {
  getConfig,
  saveConfig,

  // === 后端连接自检 ===
  async ping() {
    try {
      const r = await fetch('/health')
      return r.ok
    } catch {
      return false
    }
  },

  // === 服务器管理 ===
  async listServers() {
    return request('/api/servers')
  },
  async addServer({ id, label, host, port, tls, mode, username, password }) {
    return request('/api/servers', { method: 'POST', body: { id, label, host, port, tls, mode, username, password } })
  },
  async removeServer(serverId) {
    return request(`/api/servers/${encodeURIComponent(serverId)}`, { method: 'DELETE' })
  },
  async testServer(serverId) {
    return request(`/api/servers/${encodeURIComponent(serverId)}/test`, { method: 'POST' })
  },
  async scanNetwork(params = {}) {
    return request('/api/servers/scan', { method: 'POST', body: params })
  },

  // === 云手机 ===
  async listDevices() {
    return request('/api/devices')
  },
  async startDevice(serverId, id) {
    return request(`/api/devices/${encodeURIComponent(serverId)}/${encodeURIComponent(id)}/start`, { method: 'POST' })
  },
  async stopDevice(serverId, id) {
    return request(`/api/devices/${encodeURIComponent(serverId)}/${encodeURIComponent(id)}/stop`, { method: 'POST' })
  },
  async restartDevice(serverId, id) {
    return request(`/api/devices/${encodeURIComponent(serverId)}/${encodeURIComponent(id)}/restart`, { method: 'POST' })
  },
  async deleteDevice(serverId, id) {
    return request(`/api/devices/${encodeURIComponent(serverId)}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  },
  async batchDevices(serverId, ids, action) {
    return request(`/api/devices/${encodeURIComponent(serverId)}/batch`, { method: 'POST', body: { ids, action } })
  },
  async createDevice(serverId, { image, name }) {
    return request(`/api/devices/${encodeURIComponent(serverId)}`, { method: 'POST', body: { image, name } })
  },

  // === 镜像 ===
  async listImages() {
    return request('/api/images')
  },
  // 拉取镜像走 SSE（后端会逐行吐 NDJSON）
  async pullImageStream(serverId, image, onMessage) {
    const res = await fetch(`/api/images/${encodeURIComponent(serverId)}/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ image }),
    })
    if (!res.ok || !res.body) {
      const text = await res.text()
      throw new Error(text || '拉取失败')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (!payload) continue
        try {
          onMessage(JSON.parse(payload))
        } catch { /* 忽略解析错误 */ }
      }
    }
  },

  // === SDK 模式 ===
  async listSdkDevices() {
    return request('/api/sdk/devices')
  },
  async sdkLogin(serverId, username, password) {
    return request(`/api/sdk/servers/${encodeURIComponent(serverId)}/login`, {
      method: 'POST',
      body: { username, password },
    })
  },
  async getSdkScreenshot(serverId, deviceName) {
    return request(`/api/sdk/devices/${encodeURIComponent(serverId)}/${encodeURIComponent(deviceName)}/screenshot`)
  },
  async batchSdkScreenshots(serverId, devices) {
    // devices: [{ name, instanceNum }]
    return request(`/api/sdk/devices/${encodeURIComponent(serverId)}/screenshots`, {
      method: 'POST',
      body: {
        deviceNames: devices.map(d => d.name),
        instanceNums: devices.map(d => d.instanceNum),
      },
    })
  },
  async sdkRpa(serverId, deviceName, action, params, { host } = {}) {
    return request(`/api/sdk/devices/${encodeURIComponent(serverId)}/${encodeURIComponent(deviceName)}/rpa`, {
      method: 'POST',
      body: { action, ...params, host },
    })
  },
  async enableSdkDockerApi(serverId, enable = true) {
    return request(`/api/sdk/servers/${encodeURIComponent(serverId)}/docker-api`, {
      method: 'POST',
      body: { enable },
    })
  },

  // === 容器级 API (MYT_ANDROID_API) ===
  async discoverContainers(host, maxIndex = 12, mode = 'non-bridge', concurrency = 6) {
    const qs = new URLSearchParams({ host, maxIndex: String(maxIndex), mode, concurrency: String(concurrency) })
    return request(`/api/containers/discover?${qs}`)
  },
  async getContainerPorts(index = 1, mode = 'non-bridge') {
    const qs = new URLSearchParams({ index: String(index), mode })
    return request(`/api/containers/ports?${qs}`)
  },
  async listContainers() {
    return request('/api/containers')
  },
  async getContainerInfo(host, index, mode = 'non-bridge') {
    const qs = new URLSearchParams({ mode })
    return request(`/api/containers/${encodeURIComponent(host)}/${encodeURIComponent(index)}/info?${qs}`)
  },
  async getContainerVersion(host, index, mode = 'non-bridge') {
    const qs = new URLSearchParams({ mode })
    return request(`/api/containers/${encodeURIComponent(host)}/${encodeURIComponent(index)}/version?${qs}`)
  },
  async getContainerScreenshot(host, index, mode = 'non-bridge') {
    const qs = new URLSearchParams({ mode })
    return request(`/api/containers/${encodeURIComponent(host)}/${encodeURIComponent(index)}/screenshot?${qs}`)
  },
  async batchContainerScreenshots(targets) {
    return request('/api/containers/screenshots', { method: 'POST', body: { targets } })
  },
  async containerAction(host, index, action, params = {}, mode = 'non-bridge') {
    const qs = new URLSearchParams({ mode })
    return request(`/api/containers/${encodeURIComponent(host)}/${encodeURIComponent(index)}/action?${qs}`, {
      method: 'POST',
      body: { action, ...params },
    })
  },
  async batchContainerAction(targets, action, params = {}) {
    return request('/api/containers/batch-action', { method: 'POST', body: { targets, action, ...params } })
  },

  // === 摄像头推流 ===

  /**
   * 开启虚拟摄像头
   * @param {string} host - 宿主机 IP
   * @param {number} index - 实例位
   */
  async startCamera(host, index) {
    return request(`/api/camera/${encodeURIComponent(host)}/${encodeURIComponent(index)}/start`, { method: 'POST' })
  },

  /**
   * 关闭虚拟摄像头
   * @param {string} host - 宿主机 IP
   * @param {number} index - 实例位
   */
  async stopCamera(host, index) {
    return request(`/api/camera/${encodeURIComponent(host)}/${encodeURIComponent(index)}/stop`, { method: 'POST' })
  },

  /**
   * 获取摄像头状态
   * @param {string} host - 宿主机 IP
   * @param {number} index - 实例位
   */
  async getCameraStatus(host, index) {
    return request(`/api/camera/${encodeURIComponent(host)}/${encodeURIComponent(index)}/status`)
  },

  /**
   * 获取推流二维码 URL
   * @param {string} token - 推流 token
   */
  async getCameraQrcode(token) {
    return request(`/api/camera/qrcode?token=${encodeURIComponent(token)}`)
  },
}