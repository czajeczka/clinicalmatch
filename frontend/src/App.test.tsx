import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the landing page on first run (no device identity yet)', async () => {
    render(<App />)
    // The whole provider + router + shell tree mounts without throwing; with no
    // saved user the app shows the public landing page (which leads to onboarding).
    expect(
      await screen.findByRole('heading', {
        name: /find the right clinical trial/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /get started/i }).length
    ).toBeGreaterThan(0)
  })
})
