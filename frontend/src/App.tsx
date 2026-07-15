import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from '@/store/store'
import { AppShell } from '@/layout/AppShell'
import { Onboarding } from '@/pages/Onboarding'
import { Home } from '@/pages/Home'
import { Trials } from '@/pages/Trials'
import { TrialDetail } from '@/pages/TrialDetail'
import { Assistant } from '@/pages/Assistant'
import { Support } from '@/pages/Support'
import { Board } from '@/pages/Board'
import { Thread } from '@/pages/Thread'
import { Profile } from '@/pages/Profile'
import { Admin } from '@/pages/Admin'
import { Landing } from '@/pages/Landing'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/welcome" element={<Landing />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<AppShell />}>
            <Route index element={<Home />} />
            <Route path="trials" element={<Trials />} />
            <Route path="trials/:id" element={<TrialDetail />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="support" element={<Support />} />
            <Route path="support/:groupId" element={<Board />} />
            <Route path="discussion/:id" element={<Thread />} />
            <Route path="profile" element={<Profile />} />
            <Route path="admin" element={<Admin />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
