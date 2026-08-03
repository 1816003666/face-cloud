import { useState, useEffect } from 'react'
import { api } from '../api/backend'
import { images as registryImages } from '../data/mockData'
import { Download, Trash2, Search, Server, Box, CheckCircle, Loader2, Copy, AlertCircle, RefreshCw } from 'lucide-react'

export default function ImageManage() {
  const [localImages, setLocalImages] = useState([])
  const [servers, setServers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [pullingId, setPullingId] = useState(null)
  const [pullTargetServer, setPullTargetServer] = useState('')
  const [pullProgress, setPullProgress] = useState('')
  const [copiedRegistry, setCopiedRegistry] = useState(null)
  const [filters, setFilters] = useState({ search: '' })
  const [tab, setTab] = useState('registry')  // registry | local

  async function loadLocal() {
    try {
      const [list, srvList] = await Promise.all([api.listImages(), api.listServers()])
      setLocalImages(list)
      setServers(srvList)
      if (srvList.length > 0 && !pullTargetServer) setPullTargetServer(srvList[0].id)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadLocal() }, [])

  const pulledRegistries = new Set(localImages.map(i => i.tags?.[0]).filter(Boolean))

  async function handlePull(registry) {
    if (!pullTargetServer) {
      setError('请先在「系统设置」中添加服务器')
      return
    }
    setPullingId(registry)
    setPullProgress('准备拉取...')
    setError(null)
    try {
      await api.pullImageStream(pullTargetServer, registry, (msg) => {
        if (msg.error) {
          setError(msg.error)
        } else if (msg.done) {
          setPullProgress('拉取完成')
        } else if (msg.progress) {
          const p = msg.progress
          if (p.status) {
            setPullProgress(p.status + (p.id ? ` [${p.id}]` : ''))
          }
        }
      })
      await loadLocal()
    } catch (e) {
      setError(e.message)
    } finally {
      setPullingId(null)
      setTimeout(() => setPullProgress(''), 2000)
    }
  }

  function handleCopy(text) {
    navigator.clipboard?.writeText(text)
    setCopiedRegistry(text)
    setTimeout(() => setCopiedRegistry(null), 2000)
  }

  const variantColors = {
    GMS: 'bg-green-100 text-green-700 border-green-200',
    BASE: 'bg-gray-100 text-gray-700 border-gray-200',
    XP: 'bg-purple-100 text-purple-700 border-purple-200',
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              镜像管理
              <span className="text-xs font-normal text-gray-500 flex items-center gap-1">
                <Server size={12} />魔云腾官方仓库 + 本地镜像
              </span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border">
              <Box size={16} className="text-gray-400" />
              <span className="text-sm text-gray-600">本地镜像 {localImages.length} 个</span>
            </div>
            <button onClick={loadLocal} className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              <RefreshCw size={14} />
              刷新本地
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-red-500">×</button>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button onClick={() => setTab('registry')} className={`px-4 py-2 text-sm font-medium rounded-lg ${tab === 'registry' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              魔云腾仓库 ({registryImages.length})
            </button>
            <button onClick={() => setTab('local')} className={`px-4 py-2 text-sm font-medium rounded-lg ${tab === 'local' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}>
              本地已拉取 ({localImages.length})
            </button>
          </div>
          <div className="flex items-center gap-3">
            <select value={pullTargetServer} onChange={(e) => setPullTargetServer(e.target.value)} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg bg-white">
              <option value="">选择拉取目标服务器</option>
              {servers.map(s => <option key={s.id} value={s.id}>{s.label} ({s.host}:{s.port})</option>)}
            </select>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜索镜像"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-auto p-6">
        {tab === 'registry' && (
          <div className="space-y-3">
            {registryImages
              .filter((img) => !filters.search || img.name.toLowerCase().includes(filters.search.toLowerCase()))
              .map((img) => {
                const isPulled = pulledRegistries.has(img.registry)
                const isPulling = pullingId === img.registry
                return (
                  <div key={img.id} className="bg-white rounded-lg border border-gray-200 shadow-sm">
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="text-sm font-semibold text-gray-900">{img.name}</h3>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${variantColors[img.variant] || variantColors.BASE}`}>
                              {img.variant}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                              {img.android}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              {img.model}
                            </span>
                            <span className="text-xs text-gray-400">· {img.size}</span>
                          </div>
                          <div className="flex items-center gap-1 mb-1">
                            <code className="text-xs bg-gray-50 px-2 py-0.5 rounded border border-gray-200 text-gray-600 truncate max-w-xl">{img.registry}</code>
                            <button onClick={() => handleCopy(img.registry)} className="p-1 text-gray-400 hover:text-blue-500" title="复制">
                              <Copy size={12} />
                            </button>
                            {copiedRegistry === img.registry && <span className="text-xs text-green-500">已复制</span>}
                          </div>
                          <div className="text-xs text-gray-500">{img.desc}</div>
                          {isPulling && pullProgress && (
                            <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
                              <Loader2 size={12} className="animate-spin" />
                              {pullProgress}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0">
                          {isPulled ? (
                            <span className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 bg-green-50 rounded-lg border border-green-200">
                              <CheckCircle size={14} />已拉取
                            </span>
                          ) : (
                            <button
                              onClick={() => handlePull(img.registry)}
                              disabled={isPulling || !pullTargetServer}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                            >
                              <Download size={14} />
                              {isPulling ? '拉取中' : '拉取'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {tab === 'local' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-gray-400 flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={16} />加载中...
              </div>
            ) : localImages.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <Box size={36} className="mx-auto mb-3 opacity-30" />
                <p>本地还没有镜像，请到「魔云腾仓库」选项卡拉取</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">镜像名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">Tag</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">服务器</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">大小</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">创建时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {localImages
                    .filter((img) => !filters.search || (img.tags?.[0] || '').toLowerCase().includes(filters.search.toLowerCase()) || (img.serverLabel || '').toLowerCase().includes(filters.search.toLowerCase()))
                    .map((img) => (
                      <tr key={img.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm font-mono text-gray-900">{img.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{img.version}</td>
                        <td className="px-6 py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            <Server size={10} />
                            {img.serverLabel || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-600">{img.size}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{new Date(img.created).toLocaleString()}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  )
}