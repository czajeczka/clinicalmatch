import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock the API so the dashboard mounts without touching the network. The store
// and the page both import this module.
vi.mock('@/mock/mockApi', () => ({
  api: {
    getSavedTrials: vi.fn().mockResolvedValue([]),
    getMemberships: vi.fn().mockResolvedValue([]),
    getUser: vi.fn().mockResolvedValue(null),
    getNotifications: vi.fn().mockResolvedValue([]),
    getFacets: vi.fn().mockResolvedValue({
      diseases: ['Breast Cancer'],
      countries: ['Poland', 'Germany'],
      cities: [],
      sponsors: [],
      phases: [],
      statuses: [],
    }),
    getTrialsPage: vi
      .fn()
      .mockResolvedValue({ items: [], total: 42, limit: 1, offset: 0 }),
    markNotificationRead: vi.fn().mockResolvedValue({}),
  },
}))

import { Home } from './Home'
import { AppProvider } from '@/store/store'

function renderHome() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Home />
      </AppProvider>
    </MemoryRouter>
  )
}

describe('Home dashboard', () => {
  beforeEach(() => localStorage.clear())

  it('renders the top bar, hero and key sections', async () => {
    renderHome()

    // Global search in the top navigation bar.
    expect(
      screen.getByRole('searchbox', { name: /search trials/i })
    ).toBeInTheDocument()

    // Hero welcome heading (h1).
    expect(
      screen.getByRole('heading', { level: 1, name: /welcome back/i })
    ).toBeInTheDocument()

    // Section landmarks.
    expect(
      screen.getByRole('heading', { name: /quick actions/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /recommended for you/i })
    ).toBeInTheDocument()

    // Premium quick-action cards preserve the core journeys (hero CTA + card
    // both offer "Find trials"); the card is identified by its supporting copy.
    expect(
      screen.getAllByRole('button', { name: /find trials/i }).length
    ).toBeGreaterThanOrEqual(2)
    expect(
      screen.getByText(/search recruiting european studies/i)
    ).toBeInTheDocument()

    // Live platform statistics render once loaded (counts come from the API).
    expect((await screen.findAllByText('42')).length).toBeGreaterThan(0)
  })
})
