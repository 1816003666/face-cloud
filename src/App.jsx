import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import DeviceManage from './pages/DeviceManage'
import GroupManage from './pages/GroupManage'
import MultiPreview from './pages/MultiPreview'
import BatchControl from './pages/BatchControl'
import AppManage from './pages/AppManage'
import ScriptReplay from './pages/ScriptReplay'
import TaskSchedule from './pages/TaskSchedule'
import AlertMonitor from './pages/AlertMonitor'
import Statistics from './pages/Statistics'
import DeviceLogs from './pages/DeviceLogs'
import FileTransfer from './pages/FileTransfer'
import UserManage from './pages/UserManage'
import AuditLog from './pages/AuditLog'
import ImageManage from './pages/ImageManage'
import Settings from './pages/Settings'
import StreamPage from './pages/StreamPage'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="images" element={<ImageManage />} />
            <Route path="devices" element={<DeviceManage />} />
            <Route path="groups" element={<GroupManage />} />
            <Route path="preview" element={<MultiPreview />} />
            <Route path="batch" element={<BatchControl />} />
            <Route path="apps" element={<AppManage />} />
            <Route path="scripts" element={<ScriptReplay />} />
            <Route path="tasks" element={<TaskSchedule />} />
            <Route path="alerts" element={<AlertMonitor />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="logs" element={<DeviceLogs />} />
            <Route path="transfer" element={<FileTransfer />} />
            <Route path="users" element={<UserManage />} />
            <Route path="audit" element={<AuditLog />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          {/* 摄像头推流页面 (二维码扫码入口) */}
          <Route path="camera/stream" element={<StreamPage />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}