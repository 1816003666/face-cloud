import { useState } from 'react'
import { Plus, Edit, Trash2, Smartphone } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/Modal'

export default function GroupManage() {
  const { groups, setGroups, devices } = useApp()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState(null)
  const [deletingGroup, setDeletingGroup] = useState(null)
  const [formData, setFormData] = useState({ name: '' })

  // 获取分组中的设备数量
  const getDeviceCount = (groupId) => {
    return devices.filter(device => device.groupId === groupId).length
  }

  // 打开新建分组弹窗
  const handleCreate = () => {
    setEditingGroup(null)
    setFormData({ name: '' })
    setIsModalOpen(true)
  }

  // 打开编辑分组弹窗
  const handleEdit = (group) => {
    setEditingGroup(group)
    setFormData({ name: group.name })
    setIsModalOpen(true)
  }

  // 打开删除确认弹窗
  const handleDeleteClick = (group) => {
    setDeletingGroup(group)
    setIsDeleteModalOpen(true)
  }

  // 提交表单（新建或编辑）
  const handleSubmit = () => {
    if (!formData.name.trim()) return

    if (editingGroup) {
      // 编辑分组
      setGroups(groups.map(g =>
        g.id === editingGroup.id ? { ...g, name: formData.name } : g
      ))
    } else {
      // 新建分组
      const newGroup = {
        id: `group-${Date.now()}`,
        name: formData.name,
        createdAt: new Date().toISOString().split('T')[0]
      }
      setGroups([...groups, newGroup])
    }

    setIsModalOpen(false)
    setFormData({ name: '' })
  }

  // 确认删除分组
  const handleConfirmDelete = () => {
    setGroups(groups.filter(g => g.id !== deletingGroup.id))
    setIsDeleteModalOpen(false)
    setDeletingGroup(null)
  }

  return (
    <div className="p-6">
      {/* 页面标题和操作栏 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">分组管理</h1>
          <p className="text-sm text-gray-500 mt-1">管理云手机设备分组，便于批量操作</p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={18} />
          新建分组
        </button>
      </div>

      {/* 分组列表表格 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {groups.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">暂无分组数据</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    分组名称
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    设备数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groups.map((group, index) => (
                  <tr key={group.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Smartphone size={20} className="text-blue-600" />
                        </div>
                        <div className="text-sm font-medium text-gray-900">{group.name}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {getDeviceCount(group.id)} 台设备
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {group.createdAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(group)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
                        >
                          <Edit size={14} />
                          编辑
                        </button>
                        <button
                          onClick={() => handleDeleteClick(group)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium bg-red-500 hover:bg-red-600 text-white transition-colors"
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 新建/编辑分组弹窗 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroup ? '编辑分组' : '新建分组'}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              分组名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="请输入分组名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formData.name.trim()}
              className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {editingGroup ? '保存' : '创建'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="确认删除"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            确定要删除分组 <span className="font-semibold text-gray-900">{deletingGroup?.name}</span> 吗？
          </p>
          <p className="text-sm text-amber-600">
            注意：删除分组后，该分组中的设备将移动到默认分组。
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleConfirmDelete}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}