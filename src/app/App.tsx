import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import AppShell from './AppShell'
import UpdatePrompt from './UpdatePrompt'
import LibraryHome from '@/features/library/LibraryHome'
import BookDetails from '@/features/book/BookDetails'
import Reader from '@/features/reader/Reader'
import SettingsScreen from '@/features/settings/SettingsScreen'
import StorageScreen from '@/features/settings/StorageScreen'
import InstallGuide from '@/features/settings/InstallGuide'
import NotFound from './NotFound'

const AdminRoutes = lazy(() => import('@/features/admin/AdminRoutes'))

export default function App() {
  return (
    <>
      <UpdatePrompt />
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<LibraryHome />} />
          <Route path="book/:slug" element={<BookDetails />} />
          <Route path="settings" element={<SettingsScreen />} />
          <Route path="settings/storage" element={<StorageScreen />} />
          <Route path="settings/install" element={<InstallGuide />} />
        </Route>
        <Route path="read/:slug" element={<Reader />} />
        <Route
          path="admin/*"
          element={
            <Suspense
              fallback={
                <p role="status" style={{ padding: 'var(--space-6)' }}>
                  Opening the workshop…
                </p>
              }
            >
              <AdminRoutes />
            </Suspense>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
