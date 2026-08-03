import { useState } from 'react'
import { Plus, Edit, Trash2, UserCheck, UserX } from 'lucide-react'
import { useApp } from '../context/AppContext'
import Modal from '../components/Modal'

function RoleBadge({ role }) {
  const roleStyles = {
    '管理员': 'bg-purple-100 text-purple-800 border-purple-200',
    '操作员': 'bg-blue-100 text-blue-800 border-blue-200',
    '观察员': 'bg-gray-100 text-gray-800 border-gray-200',
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleStyles[role] || roleStyles['观察员']}`}>
      {role}
    </span>
  )
}

function StatusBadge({ status }) {
  const isNormal = status === '正常'

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      isNormal ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isNormal ? 'bg-green-500' : 'bg-red-500'}`}></span>
      {status}
    </span>
  )
}

export default function UserManage() {
  const { users, setUsers } = useApp()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: '操作员',
    status: '正常'
  })

  const handleAddUser = () => {
    setEditingUser(null)
    setFormData({
      username: '',
      email: '',
      role: '操作员',
      status: '正常'
    })
    setIsModalOpen(true)
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status
    })
    setIsModalOpen(true)
  }

  const handleToggleStatus = (userId) => {
    setUsers(users.map(user => {
      if (user.id === userId) {
        return {
          ...user,
          status: user.status === '正常' ? '禁用' : '正常'
        }
      }
      return user
    }))
  }

  const handleDeleteUser = (userId) => {
    if (confirm('确定要删除该用户吗?')) {
      setUsers(users.filter(user => user.id !== userId))
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (editingUser) {
      // 编辑用户
      setUsers(users.map(user => {
        if (user.id === editingUser.id) {
          return {
            ...user,
            username: formData.username,
            email: formData.email,
            role: formData.role,
            status: formData.status
          }
        }
        return user
      }))
    } else {
      // 添加新用户
      const newUser = {
        id: `user-${Date.now()}`,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        status: formData.status,
        lastLogin: '-'
      }
      setUsers([...users, newUser])
    }

    setIsModalOpen(false)
  }

  return (
    <div className="p-6">
      {/* 头部 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">用户管理</h1>
          <p className="mt-1 text-sm text-gray-500">管理平台用户账户和权限</p>
        </div>
        <button
          onClick={handleAddUser}
          className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} className="mr-2" />
          添加用户
        </button>
      </div>

      {/* 用户表格 */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">用户名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">最后登录</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">邮箱</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((user, index) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={user.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastLogin}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="inline-flex items-center px-3 py-1 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-xs font-medium transition-colors"
                      >
                        <Edit size={14} className="mr-1" />
                        编辑
                      </button>
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium transition-colors ${
                          user.status === '正常'
                            ? 'bg-amber-100 border border-amber-300 hover:bg-amber-200 text-amber-700'
                            : 'bg-green-100 border border-green-300 hover:bg-green-200 text-green-700'
                        }`}
                      >
                        {user.status === '正常' ? (
                          <>
                            <UserX size={14} className="mr-1" />
                            禁用
                          </>
                        ) : (
                          <>
                            <UserCheck size={14} className="mr-1" />
                            启用
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="inline-flex items-center px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        <Trash2 size={14} className="mr-1" />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-gray-500">暂无用户数据</p>
          </div>
        )}
      </div>

      {/* 添加/编辑用户弹窗 */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? '编辑用户' : '添加用户'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              用户名
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入邮箱"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="管理员">管理员</option>
              <option value="操作员">操作员</option>
              <option value="观察员">观察员</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              状态
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="正常">正常</option>
              <option value="禁用">禁用</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              {editingUser ? '保存' : '添加'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}