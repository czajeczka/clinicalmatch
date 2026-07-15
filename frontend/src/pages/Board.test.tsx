import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

vi.mock('@/mock/mockApi', () => ({
  api: {
    getGroups: vi.fn().mockResolvedValue([
      {
        id: 'g-bc',
        name: 'Breast Cancer Together',
        disease: 'Breast Cancer',
        description:
          'A supportive community for people affected by breast cancer.',
        color: '#9A5275',
        member_count: 214,
      },
    ]),
    getGroupDiscussions: vi.fn().mockResolvedValue([]),
    getSavedTrials: vi.fn().mockResolvedValue([]),
    getMemberships: vi.fn().mockResolvedValue([]),
    getUser: vi.fn().mockResolvedValue(null),
    getNotifications: vi.fn().mockResolvedValue([]),
  },
}))

import { Board } from './Board'
import { AppProvider } from '@/store/store'

function renderBoard() {
  return render(
    <MemoryRouter initialEntries={['/support/g-bc']}>
      <AppProvider>
        <Routes>
          <Route path="/support/:groupId" element={<Board />} />
        </Routes>
      </AppProvider>
    </MemoryRouter>
  )
}

describe('Community Home (Board)', () => {
  beforeEach(() => localStorage.clear())

  it('renders the community, safety notice, create action and rules', async () => {
    renderBoard()

    // Community name in the cover header (h1).
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: /breast cancer together/i,
      })
    ).toBeInTheDocument()

    // Peer-support safety notice.
    expect(screen.getByText(/peer support only/i)).toBeInTheDocument()

    // Create post (toolbar + FAB + empty state) and search.
    expect(
      screen.getAllByRole('button', { name: /create post/i }).length
    ).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByRole('searchbox', { name: /search discussions/i })
    ).toBeInTheDocument()

    // Community rules sidebar + empty feed state.
    expect(screen.getByText(/community rules/i)).toBeInTheDocument()
    expect(screen.getByText(/no discussions yet/i)).toBeInTheDocument()
  })
})
