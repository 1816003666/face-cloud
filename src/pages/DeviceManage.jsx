import { useState, useEffect, useMemo } from 'react'
import { api } from '../api/backend'
import { Plus, FolderPlus, Palette, Search, RefreshCw, ChevronDown, AlertCircle, Loader2, Server } from 'lucide-react'
import Modal from '../components/Modal'

const models = ['Zeus Q1', 'P1', 'C1', 'R1S']
const skins = ['default', '深色模式', '商务蓝', '科技紫', '清新绿']

export default function DeviceManage() {
  const [devices, setDevices] = useState([])
  const [images, setImages] = useState([])
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [backendOk, setBackendOk] = useState(true)

  const [filters, setFilters] = useState({ search: '', status: '', groupId: '', serverId: '' })
  const [modal, setModal] = useState({ type: null, data: null })
  const [isRefreshing, setIsRefreshing] = useState(false)

  // 模拟分组（魔云腾容器没有分组的概念，前端用 name 前缀做简单分组）
  const groups = useMemo(() => {
    const set = new Set()
    devices.forEach((d) => {
      if (d.error) return
      const prefix = (d.name || '').split('-')[0] || '其他'
      set.add(prefix)
    })
    return Array.from(set).map((name) => ({ id: name, name }))
  }, [devices])

  async function load() {
    setIsRefreshing(true)
    setError(null)
    try {
      const [list, imgList, srvList, sdkList] = await Promise.all([
        api.listDevices().catch(() => []),
        api.listImages().catch(() => []),
        api.listServers(),
        api.listSdkDevices().catch(() => []),
      ])
      // 合并 Docker 设备和 SDK 设备
      const allDevices = [...list, ...sdkList]
      setDevices(allDevices)
      setImages(imgList)
      setServers(srvList)
      setBackendOk(true)
    } catch (e) {
      setError(e.message)
      setBackendOk(false)
    } finally {
      setLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  const filteredDevices = useMemo(() => {
    return devices.filter((device) => {
      // 连接失败的服务器占位条目也支持搜索
      const matchSearch = (device.name || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (device.image || '').toLowerCase().includes(filters.search.toLowerCase()) ||
        (device.serverLabel || '').toLowerCase().includes(filters.search.toLowerCase())
      const matchStatus = filters.status ? device.status === filters.status : true
      const matchGroup = filters.groupId ? (device.name || '').startsWith(filters.groupId) : true
      const matchServer = filters.serverId ? device.serverId === filters.serverId : true
      return matchSearch && matchStatus && matchGroup && matchServer
    })
  }, [devices, filters])

  const onlineCount = devices.filter((d) => d.status === '运行中').length
  const closeModal = () => setModal({ type: null, data: null })

  // 按服务器分组统计
  const serverStats = useMemo(() => {
    const map = new Map()
    devices.forEach((d) => {
      const key = d.serverId || 'unknown'
      if (!map.has(key)) map.set(key, { serverId: key, serverLabel: d.serverLabel || '未知', serverHost: d.serverHost || '', total: 0, online: 0, error: !!d.error })
      const entry = map.get(key)
      entry.total++
      if (d.status === '运行中') entry.online++
    })
    return Array.from(map.values())
  }, [devices])

  async function handleBatchCreate(count, prefix, selectedImageId, targetServerId) {
    const selectedImage = images.find(img => img.Id === selectedImageId || img.id === selectedImageId)
    const imageName = selectedImage ? (selectedImage.tags?.[0] || `${selectedImage.name}:${selectedImage.version}`) : null
    if (!imageName) {
      alert('请选择镜像')
      return
    }
    setError(null)
    let success = 0
    for (let i = 1; i <= count; i++) {
      const name = `${prefix}-${String(Date.now() + i).slice(-6)}-${i}`
      try {
        await api.createDevice(targetServerId, { image: imageName, name })
        success++
      } catch (e) {
        setError(`创建 ${name} 失败：${e.message}`)
        break
      }
    }
    await load()
    closeModal()
    if (success > 0) alert(`成功创建 ${success} 台云手机`)
  }

  async function handleToggleStatus(device) {
    if (device.error) return
    setError(null)
    try {
      if (device.mode === 'sdk') {
        // SDK 模式: 使用 RPA 重启（魔云腾 SDK 不支持直接启停，用 reboot 代替）
        await api.sdkRpa(device.serverId, device.name, 'shell', { command: 'input keyevent 3' })
      } else {
        if (device.status === '运行中') {
          await api.stopDevice(device.serverId, device.id)
        } else {
          await api.startDevice(device.serverId, device.id)
        }
      }
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleRestart(device) {
    if (device.error) return
    setError(null)
    try {
      if (device.mode === 'sdk') {
        // SDK 模式: 使用魔云腾重启接口
        await api.sdkRpa(device.serverId, device.name, 'shell', { command: 'reboot' })
      } else {
        await api.restartDevice(device.serverId, device.id)
      }
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleDelete(device) {
    if (device.error) return
    if (!window.confirm('确定要删除该设备吗？此操作不可恢复。')) return
    setError(null)
    try {
      if (device.mode === 'sdk') {
        alert('SDK 模式设备不支持删除，请在魔云腾管理后台操作')
        return
      }
      await api.deleteDevice(device.serverId, device.id)
      await load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function handleScreenshot(device) {
    if (device.error || device.mode !== 'sdk') return
    try {
      const result = await api.getSdkScreenshot(device.serverId, device.name)
      if (result.data) {
        const img = `data:${result.contentType};base64,${result.data}`
        const w = window.open()
        w.document.write(`<img src="${img}" style="max-width:100%">`)
      }
    } catch (e) {
      setError('截图失败：' + e.message)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
          正在从所有魔云腾服务器拉取设备列表...
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-100">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              设备管理
              <span className="text-xs font-normal text-gray-500 flex items-center gap-1">
                <Server size={12} />
                {servers.length} 台服务器 · 实时聚合
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              <span className="text-sm text-gray-600">在线 {onlineCount}/{devices.length}</span>
            </div>
          </div>
        </div>
        {/* 服务器统计条 */}
        {serverStats.length > 0 && (
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {serverStats.map((s) => (
              <span key={s.serverId} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${s.error ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-gray-50 text-gray-600 border border-gray-200'}`}>
                <Server size={10} />
                {s.error ? `${s.serverLabel} (连接失败)` : `${s.serverLabel}: ${s.online}/${s.total}`}
              </span>
            ))}
          </div>
        )}
      </header>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <div className="font-medium">操作失败</div>
            <div>{error}</div>
          </div>
          <button onClick={() => setError(null)} className="text-red-500">×</button>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setModal({ type: 'batchCreate' })} className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <Plus size={16} />
              批量建机
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索名称/镜像/服务器"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">状态</option>
              <option value="运行中">运行中</option>
              <option value="已停止">已停止</option>
              <option value="离线">离线</option>
            </select>
            <select value={filters.serverId} onChange={(e) => setFilters({ ...filters, serverId: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">全部服务器</option>
              {servers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <select value={filters.groupId} onChange={(e) => setFilters({ ...filters, groupId: e.target.value })} className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">分组</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <button onClick={load} disabled={isRefreshing} className={`flex items-center gap-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium ${isRefreshing ? 'opacity-70' : ''}`}>
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              刷新
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-auto p-6">
        {!backendOk && devices.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Server size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">未连接到魔云腾服务器</h3>
            <p className="text-sm text-gray-500 mb-4">请先在「系统设置」中添加服务器并启动后端服务</p>
            <a href="/settings" className="inline-flex items-center gap-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
              前往系统设置
            </a>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">名称</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">服务器</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">状态</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">镜像</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">容器IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDevices.map((device, index) => (
                    <tr key={device.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${device.error ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{device.mode === 'sdk' ? device.instanceNum : device.id?.slice(0, 12)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">{device.name}</span>
                          {device.mode === 'sdk' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">SDK</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400">{device.lastActive}</div>
                        {device.mode === 'sdk' && device.brand && (
                          <div className="text-xs text-gray-500">{device.brand} {device.model} · Android {device.androidVersion}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          <Server size={10} />
                          {device.serverLabel}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {device.error ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-red-500"></span>
                            连接失败
                          </span>
                        ) : (
                          <StatusBadge status={device.status} />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {device.image || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{device.ip || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {device.error ? (
                          <span className="text-xs text-red-500">请检查服务器连接</span>
                        ) : (
                          <div className="flex items-center gap-2 flex-wrap">
                            <ActionButton onClick={() => setModal({ type: 'detail', data: device })}>详情</ActionButton>
                            {device.mode === 'sdk' && (
                              <ActionButton onClick={() => handleScreenshot(device)}>截图</ActionButton>
                            )}
                            <ActionButton variant="warning" onClick={() => handleToggleStatus(device)}>
                              {device.status === '运行中' ? '停止' : '启动'}
                            </ActionButton>
                            <ActionButton onClick={() => handleRestart(device)}>重启</ActionButton>
                            {device.mode !== 'sdk' && (
                              <ActionButton variant="danger" onClick={() => handleDelete(device)}>删除</ActionButton>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredDevices.length === 0 && (
                <div className="text-center py-12 text-gray-400 text-sm">
                  暂无设备。请先到「镜像管理」拉取镜像，然后点「批量建机」创建。
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <BatchCreateModal
        isOpen={modal.type === 'batchCreate'}
        onClose={closeModal}
        onConfirm={handleBatchCreate}
        images={images}
        servers={servers}
      />
      <DetailModal isOpen={modal.type === 'detail'} onClose={closeModal} device={modal.data} />
    </div>
  )
}

function StatusBadge({ status }) {
  const styles = {
    '运行中': 'bg-green-100 text-green-800',
    '已停止': 'bg-amber-100 text-amber-800',
    '离线': 'bg-gray-100 text-gray-800',
  }
  const dots = {
    '运行中': 'bg-green-500',
    '已停止': 'bg-amber-500',
    '离线': 'bg-gray-500',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || styles['离线']}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status] || dots['离线']}`}></span>
      {status}
    </span>
  )
}

function ActionButton({ children, variant = 'default', onClick }) {
  const variants = {
    default: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
    warning: 'bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-700',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  }
  return (
    <button onClick={onClick} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${variants[variant]}`}>
      {children}
    </button>
  )
}

function BatchCreateModal({ isOpen, onClose, onConfirm, images, servers }) {
  const [count, setCount] = useState(3)
  const [prefix, setPrefix] = useState('MYT-Q1')
  const [selectedImageId, setSelectedImageId] = useState('')
  const [targetServerId, setTargetServerId] = useState('')

  const selectedImage = images.find(img => (img.Id || img.id) === selectedImageId)
  const imageName = selectedImage ? (selectedImage.tags?.[0] || `${selectedImage.name}:${selectedImage.version}`) : ''

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="批量建机" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">目标服务器 <span className="text-red-500">*</span></label>
          {servers.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              请先在「系统设置」中添加魔云腾服务器
            </div>
          ) : (
            <select value={targetServerId} onChange={(e) => setTargetServerId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">请选择服务器</option>
              {servers.map(s => <option key={s.id} value={s.id}>{s.label} ({s.host}:{s.port})</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">选择镜像 <span className="text-red-500">*</span></label>
          {images.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              本地还没有镜像，请先到「镜像管理」拉取。
            </div>
          ) : (
            <select value={selectedImageId} onChange={(e) => setSelectedImageId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
              <option value="">请选择镜像</option>
              {images.map(img => {
                const id = img.Id || img.id
                const tag = img.tags?.[0] || `${img.name}:${img.version}`
                return <option key={id} value={id}>{tag} - {img.size} [{img.serverLabel}]</option>
              })}
            </select>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">设备数量</label>
            <input type="number" min="1" max="20" value={count} onChange={(e) => setCount(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称前缀</label>
            <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
          <button onClick={() => onConfirm(count, prefix, selectedImageId, targetServerId)} disabled={!imageName || !targetServerId} className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">确认创建</button>
        </div>
      </div>
    </Modal>
  )
}

function DetailModal({ isOpen, onClose, device }) {
  if (!device) return null
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`设备详情 - ${device.name}`}>
      <div className="space-y-3 text-sm">
        <Row label="容器 ID" value={device.id} mono />
        <Row label="设备名称" value={device.name} />
        <Row label="所属服务器" value={device.serverLabel} />
        <Row label="服务器 IP" value={device.serverHost} mono />
        <Row label="状态" value={device.error ? '连接失败' : device.status} />
        <Row label="镜像" value={device.image || '-'} />
        <Row label="容器 IP" value={device.ip || '-'} mono />
        <Row label="运行状态" value={device.lastActive} />
      </div>
    </Modal>
  )
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 gap-4">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className={`font-medium text-right break-all ${mono ? 'font-mono text-xs' : ''}`}>{value}</span>
    </div>
  )
}