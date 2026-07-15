import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card } from './Card'

describe('Card (interactive)', () => {
  it('is a keyboard-operable button when interactive with onClick', async () => {
    const onClick = vi.fn()
    render(
      <Card interactive onClick={onClick}>
        Open me
      </Card>
    )
    const card = screen.getByRole('button', { name: /open me/i })
    expect(card).toHaveAttribute('tabindex', '0')

    card.focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('does not fire the card onClick when a nested control is activated', async () => {
    const cardClick = vi.fn()
    const innerClick = vi.fn()
    render(
      <Card interactive onClick={cardClick}>
        <span>Card body</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            innerClick()
          }}
        >
          Save
        </button>
      </Card>
    )
    // Exact name match resolves to the inner button (the card's name is
    // "Card body Save").
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(innerClick).toHaveBeenCalledTimes(1)
    expect(cardClick).not.toHaveBeenCalled()
  })

  it('stays a plain, non-focusable div when not interactive', () => {
    render(<Card>Static</Card>)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText('Static')).not.toHaveAttribute('tabindex')
  })
})
