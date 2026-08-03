import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Plus, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react'

function TaskStatusBadge({ status }) {
  const isEnable = status === '启用'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isEnable
        ? 'bg-green-100 text-green-800'
        : 'bg-gray-100 text-gray-800'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        isEnable ? 'bg-green-500' : 'bg-gray-400'
      }`}></span>
      {status}
    </span>
  )
}

function ActionButton({ children, variant = 'default', onClick, disabled }) {
  const variants = {
    default: 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700',
    primary: 'bg-blue-500 hover:bg-blue-600 text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )
}

export default function TaskSchedule() {
  const { tasks, setTasks } = useApp()
  const [editingTask, setEditingTask] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    schedule: '',
    devices: 1,
  })

  const handleToggleStatus = (taskId) => {
    setTasks(tasks.map(task =>
      task.id === taskId
        ? { ...task, status: task.status === '启用' ? '禁用' : '启用' }
        : task
    ))
  }

  const handleDelete = (taskId) => {
    if (confirm('确定要删除这个任务吗?')) {
      setTasks(tasks.filter(task => task.id !== taskId))
    }
  }

  const handleEdit = (task) => {
    setEditingTask(task)
    setFormData({
      name: task.name,
      schedule: task.schedule,
      devices: task.devices,
    })
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditingTask(null)
    setFormData({
      name: '',
      schedule: '',
      devices: 1,
    })
    setIsModalOpen(true)
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (editingTask) {
      // 编辑现有任务
      setTasks(tasks.map(task =>
        task.id === editingTask.id
          ? { ...task, ...formData }
          : task
      ))
    } else {
      // 新建任务
      const newTask = {
        id: `task-${Date.now()}`,
        ...formData,
        status: '启用',
        nextRun: '待计算',
      }
      setTasks([...tasks, newTask])
    }

    setIsModalOpen(false)
    setEditingTask(null)
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">任务调度</h1>
          <p className="text-sm text-gray-500 mt-1">管理定时任务和自动化脚本执行计划</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          新建任务
        </button>
      </div>

      {/* 表格 */}
      {tasks.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center">
          <p className="text-gray-500">暂无定时任务</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">调度表达式</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">下次执行时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">设备数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tasks.map((task, index) => (
                  <tr key={task.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{task.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 px-2 py-1 rounded text-gray-800">{task.schedule}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <TaskStatusBadge status={task.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {task.nextRun}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.devices} 台
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleStatus(task.id)}
                          className={`p-1.5 rounded transition-colors ${
                            task.status === '启用'
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-gray-400 hover:bg-gray-50'
                          }`}
                          title={task.status === '启用' ? '点击禁用' : '点击启用'}
                        >
                          {task.status === '启用' ? (
                            <ToggleRight size={18} />
                          ) : (
                            <ToggleLeft size={18} />
                          )}
                        </button>
                        <ActionButton onClick={() => handleEdit(task)}>
                          <Edit size={14} className="inline mr-1" />
                          编辑
                        </ActionButton>
                        <ActionButton variant="danger" onClick={() => handleDelete(task.id)}>
                          <Trash2 size={14} className="inline mr-1" />
                          删除
                        </ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 模态框 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTask ? '编辑任务' : '新建任务'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  任务名称
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  调度表达式 (Cron)
                </label>
                <input
                  type="text"
                  value={formData.schedule}
                  onChange={(e) => setFormData({ ...formData, schedule: e.target.value })}
                  placeholder="例如: 0 8 * * *"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">格式: 分 时 日 月 周</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  执行设备数
                </label>
                <input
                  type="number"
                  value={formData.devices}
                  onChange={(e) => setFormData({ ...formData, devices: parseInt(e.target.value) || 1 })}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600"
                >
                  {editingTask ? '保存' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}