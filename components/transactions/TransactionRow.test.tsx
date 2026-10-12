import { render, screen } from '@testing-library/react'
import type { Transaction } from '@/types/api'
import { TransactionRow } from './TransactionRow'

const transaction: Transaction = {
  id: 'txn_1',
  reference: 'ACM-1',
  type: 'card_payment',
  status: 'successful',
  currency: 'USD',
  amount: 1549,
  fee: 0,
  narration: '<img src=x onerror=alert(1)> Netflix',
  counterparty: null,
  createdAt: '2026-10-05T10:15:00.000Z',
}

it('renders upstream narration as text and formats minor units', () => {
  const { container } = render(<TransactionRow transaction={transaction} />)
  expect(screen.getByText(transaction.narration)).toBeInTheDocument()
  expect(container.querySelector('img')).toBeNull()
  expect(screen.getByText('-$15.49')).toBeInTheDocument()
})
