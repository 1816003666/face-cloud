import { useState } from 'react'
import { Play, Square, Plus, Trash2 } from 'lucide-react'
import { useApp } from '../context/AppContext'

function StatusBadge({ status }) {
  const statusStyles = {
    '就绪': 'bg-green-100 text-green-800',
    '运行中': 'bg-blue-100 text-blue-800',
  }

  const dotColors = {
    '就绪': 'bg-green-500',
    '运行中': 'bg-blue-500',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dotColors[status] || 'bg-gray-500'}`}></span>
      {status}
    </span>
  )
}

function ActionButton({ children, variant = 'default', onClick, disabled, icon: Icon }) {
  const variants = {
    default: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
    warning: 'bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-700',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  )
}

export default function ScriptReplay() {
  const { scripts, setScripts } = useApp()
  const [newScriptName, setNewScriptName] = useState('')
  const [showNewScriptInput, setShowNewScriptInput] = useState(false)

  const handleCreateScript = () => {
    if (!newScriptName.trim()) return

    const newScript = {
      id: `script-${Date.now()}`,
      name: newScriptName.trim(),
      status: '就绪',
      runs: 0,
      lastRun: '-',
      duration: '-',
    }

    setScripts([...scripts, newScript])
    setNewScriptName('')
    setShowNewScriptInput(false)
  }

  const handleExecuteScript = (id) => {
    setScripts(scripts.map(script =>
      script.id === id ? { ...script, status: '运行中' } : script
    ))
  }

  const handleStopScript = (id) => {
    setScripts(scripts.map(script =>
      script.id === id ? { ...script, status: '就绪' } : script
    ))
  }

  const handleDeleteScript = (id) => {
    if (window.confirm('确定要删除该脚本吗？此操作不可恢复。')) {
      setScripts(scripts.filter(script => script.id !== id))
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">脚本回放</h1>
        <div className="flex items-center gap-3">
          {showNewScriptInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newScriptName}
                onChange={(e) => setNewScriptName(e.target.value)}
                placeholder="请输入脚本名称"
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateScript()
                  if (e.key === 'Escape') {
                    setShowNewScriptInput(false)
                    setNewScriptName('')
                  }
                }}
              />
              <button
                onClick={handleCreateScript}
                className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                确认
              </button>
              <button
                onClick={() => {
                  setShowNewScriptInput(false)
                  setNewScriptName('')
                }}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          ) : (
            <ActionButton variant="primary" onClick={() => setShowNewScriptInput(true)} icon={Plus}>
              新建脚本
            </ActionButton>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">名称</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">执行次数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">最后执行时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">耗时</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {scripts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    暂无脚本数据
                  </td>
                </tr>
              ) : (
                scripts.map((script, index) => (
                  <tr key={script.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{script.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={script.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {script.runs}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {script.lastRun}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {script.duration}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {script.status === '运行中' ? (
                          <ActionButton
                            variant="warning"
                            onClick={() => handleStopScript(script.id)}
                            icon={Square}
                          >
                            停止
                          </ActionButton>
                        ) : (
                          <ActionButton
                            variant="primary"
                            onClick={() => handleExecuteScript(script.id)}
                            icon={Play}
                          >
                            执行
                          </ActionButton>
                        )}
                        <ActionButton
                          variant="danger"
                          onClick={() => handleDeleteScript(script.id)}
                          icon={Trash2}
                        >
                          删除
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}