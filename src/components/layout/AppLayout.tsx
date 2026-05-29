import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useProfile } from '@/hooks/useProfile'

export function AppLayout() {
  const { profile } = useProfile()

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar farmName={profile?.farm_name ?? 'My Farm'} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
