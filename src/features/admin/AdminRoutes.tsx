import { Navigate, Route, Routes } from 'react-router-dom'
import { useOwnerGate } from '@/lib/ownerGate'
import OwnerGateScreen from './OwnerGateScreen'
import AdminLayout from './AdminLayout'
import AdminDashboard from './AdminDashboard'
import AdminBooks from './AdminBooks'
import BookWizard from './wizard/BookWizard'
import AdminCategories from './AdminCategories'
import AdminBackup from './AdminBackup'
import AdminIntegrity from './AdminIntegrity'

export default function AdminRoutes() {
  const unlocked = useOwnerGate((s) => s.unlocked)
  if (!unlocked) return <OwnerGateScreen />
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="books" element={<AdminBooks />} />
        <Route path="books/new" element={<BookWizard />} />
        <Route path="books/:id/edit" element={<BookWizard />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="backup" element={<AdminBackup />} />
        <Route path="integrity" element={<AdminIntegrity />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
