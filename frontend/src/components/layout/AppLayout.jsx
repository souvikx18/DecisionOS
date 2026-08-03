import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import './AppLayout.css'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 768)

  return (
    <div className="app-layout">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`app-layout__main ${collapsed ? 'app-layout__main--collapsed' : ''}`}>
        <Topbar sidebarCollapsed={collapsed} onToggleSidebar={() => setCollapsed(c => !c)} />
        <main className="app-layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
