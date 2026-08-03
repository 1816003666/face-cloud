// 局域网魔云腾服务器自动发现扫描器
// 原理：TCP 扫描本地子网 + Docker API ping 确认

import net from 'node:net'
import os from 'node:os'
import http from 'node:http'

const SCAN_PORTS = [2375, 2376, 8000]
const CONNECT_TIMEOUT = 500   // TCP 连接超时 ms
const HTTP_TIMEOUT = 2000     // Docker ping 超时 ms
const CONCURRENCY = 20        // 并发扫描数

/** 获取本机所有 /24 子网 */
function getLocalSubnets() {
  const subnets = new Set()
  const ifaces = os.networkInterfaces()
  for (const [, addrs] of Object.entries(ifaces)) {
    for (const addr of addrs) {
      if (addr.family === 'IPv4' && !addr.internal) {
        // 提取 /24 子网，如 192.168.1.0
        const parts = addr.address.split('.')
        parts[3] = '0'
        subnets.add(parts.join('.'))
      }
    }
  }
  return Array.from(subnets)
}

/** 生成 /24 子网的所有 IP（1-254） */
function* ipRange(subnet) {
  const base = subnet.split('.').slice(0, 3).join('.')
  for (let i = 1; i <= 254; i++) {
    yield `${base}.${i}`
  }
}

/** 根据 IP 范围字符串生成 IP 列表（如 "192.168.9.100-192.168.9.199"） */
function* ipRangeFromStr(rangeStr) {
  const match = rangeStr.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)-(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (!match) return
  const [, s1, s2, s3, s4, e1, e2, e3, e4] = match.map(Number)
  const start = (s1 << 24) | (s2 << 16) | (s3 << 8) | s4
  const end = (e1 << 24) | (e2 << 16) | (e3 << 8) | e4
  const fromIP = (n) => `${(n >>> 24) & 255}.${(n >>> 16) & 255}.${(n >>> 8) & 255}.${n & 255}`
  for (let ip = start; ip <= end; ip++) {
    yield fromIP(ip)
  }
}

/** 尝试 TCP 连接到指定 IP:port */
function tcpConnect(host, port, timeout) {
  return new Promise((resolve) => {
    const sock = new net.Socket()
    sock.setTimeout(timeout)
    sock.on('connect', () => {
      sock.destroy()
      resolve(true)
    })
    sock.on('error', () => {
      sock.destroy()
      resolve(false)
    })
    sock.on('timeout', () => {
      sock.destroy()
      resolve(false)
    })
    sock.connect(port, host)
  })
}

/** 快速 Docker ping 确认 */
function dockerPing(host, port) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/_ping`, { timeout: HTTP_TIMEOUT }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => {
        resolve({
          ok: res.statusCode === 200,
          version: body || '',
          headers: res.headers,
        })
      })
    })
    req.on('error', () => resolve({ ok: false }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false })
    })
  })
}

/** SDK 管理 API ping 确认（端口 8000） */
function sdkPing(host, port) {
  return new Promise((resolve) => {
    const req = http.get(`http://${host}:${port}/info`, { timeout: HTTP_TIMEOUT }, (res) => {
      let body = ''
      res.on('data', (c) => (body += c))
      res.on('end', () => {
        let ok = false
        let info = ''
        try {
          const json = JSON.parse(body)
          ok = json.code === 200 || json.code === 0
          info = json.data?.version || json.data?.currentVersion || 'SDK API'
        } catch {
          ok = res.statusCode === 200
          info = '魔云腾管理服务'
        }
        resolve({ ok, version: info, type: 'sdk' })
      })
    })
    req.on('error', () => resolve({ ok: false }))
    req.on('timeout', () => {
      req.destroy()
      resolve({ ok: false })
    })
  })
}

/** 并发控制：同时最多 N 个任务 */
async function withConcurrency(tasks, limit) {
  const results = []
  let index = 0
  async function worker() {
    while (index < tasks.length) {
      const i = index++
      results[i] = await tasks[i]()
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()))
  return results
}

/**
 * 扫描局域网，返回发现的 Docker 服务器列表
 * @param {object} opts
 * @param {number[]} [opts.subnets]  手动指定子网（如 ['192.168.1.0']），不传则自动检测
 * @param {number}  [opts.timeout]   连接超时 ms
 * @returns {Promise<Array<{host, port, version}>>}
 */
export async function scanNetwork(opts = {}) {
  const hasRanges = opts.ranges && Array.isArray(opts.ranges) && opts.ranges.length > 0
  const hasIps = opts.ips && Array.isArray(opts.ips) && opts.ips.length > 0
  
  // 如果指定了 IP 范围或 IP 列表，则不使用默认子网
  let subnets = opts.subnets
  if (!subnets || subnets.length === 0) {
    if (hasRanges || hasIps) {
      subnets = [] // 空数组，不扫描默认子网
    } else {
      subnets = getLocalSubnets()
    }
  }
  
  const ports = opts.ports?.length ? opts.ports : SCAN_PORTS
  const timeout = opts.timeout || CONNECT_TIMEOUT

  if (subnets.length === 0 && !hasRanges && !hasIps) {
    return { discovered: [], subnets: [], message: '未检测到有效网络接口' }
  }

  // 第 1 步：生成所有待扫描的 (IP, port) 组合
  const targets = []
  for (const subnet of subnets) {
    for (const ip of ipRange(subnet)) {
      for (const port of ports) {
        targets.push({ ip, port })
      }
    }
  }
  
  // 第 1.5 步：如果指定了 IP 范围，额外添加到扫描列表
  if (hasRanges) {
    for (const rangeStr of opts.ranges) {
      for (const ip of ipRangeFromStr(rangeStr)) {
        for (const port of ports) {
          targets.push({ ip, port })
        }
      }
    }
  }
  
  // 第 1.6 步：如果指定了具体的 IP 列表，也添加到扫描列表
  if (hasIps) {
    for (const ip of opts.ips) {
      for (const port of ports) {
        targets.push({ ip, port })
      }
    }
  }

  // 第 2 步：并发 TCP 端口扫描
  const connectTasks = targets.map(({ ip, port }) => async () => {
    const ok = await tcpConnect(ip, port, timeout)
    return ok ? { ip, port } : null
  })

  const connectResults = (await withConcurrency(connectTasks, CONCURRENCY)).filter(Boolean)

  // 第 3 步：对端口开放的主机做 Ping 确认（根据端口类型选择不同的检测方法）
  const pingTasks = connectResults.map(({ ip, port }) => async () => {
    let ping
    if (port === 8000) {
      ping = await sdkPing(ip, port)
    } else {
      ping = await dockerPing(ip, port)
    }
    return ping.ok ? { host: ip, port, version: ping.version, type: ping.type || 'docker' } : null
  })

  const discovered = (await withConcurrency(pingTasks, 10)).filter(Boolean)

  return {
    discovered,
    subnets,
    scanned: targets.length,
    openPorts: connectResults.length,
    message: discovered.length > 0
      ? `发现 ${discovered.length} 台魔云腾服务器`
      : `未发现魔云腾服务器，请确认服务器在同一局域网且端口 ${ports.join('/')} 已开放`,
  }
}