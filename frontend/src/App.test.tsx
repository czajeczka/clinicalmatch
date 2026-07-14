import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders onboarding on first run (no device identity yet)', async () => {
    render(<App />)
    // The whole provider + router + shell tree mounts without throwing;
    // with no saved user we land on onboarding.
    expect(
      await screen.findByRole('heading', { name: /welcome/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /continue/i })
    ).toBeInTheDocument()
  })
})
