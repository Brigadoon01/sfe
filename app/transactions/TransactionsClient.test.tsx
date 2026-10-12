import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, vi } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { TransactionsClient } from './TransactionsClient'

const mocks = vi.hoisted(() => ({
  params: '',
  push: vi.fn(),
  replace: vi.fn(),
  getTransactions: vi.fn(),
  getTransaction: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => mocks,
  useSearchParams: () => new URLSearchParams(mocks.params),
}))
vi.mock('@/lib/api/endpoints', () => ({
  getTransactions: mocks.getTransactions,
  getTransaction: mocks.getTransaction,
}))

beforeEach(() => {
  mocks.params = ''
  mocks.push.mockReset()
  mocks.replace.mockReset()
  mocks.getTransactions.mockReset()
  mocks.getTransaction.mockReset()
  mocks.getTransactions.mockResolvedValue({
    data: [],
    meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
  })
})

it('distinguishes no history from filtered no results', async () => {
  const view = render(<TransactionsClient />)
  expect(await screen.findByText('No transactions yet')).toBeInTheDocument()
  view.unmount()

  mocks.params = 'q=impossible'
  render(<TransactionsClient />)
  expect(await screen.findByText('No transactions match your filters')).toBeInTheDocument()
  expect(screen.getByText('0 results')).toBeInTheDocument()
})

it('shows an error instead of treating an HTTP failure as an empty list', async () => {
  mocks.getTransactions.mockRejectedValue(new ApiError(500, 'INTERNAL_ERROR', 'Try again'))
  render(<TransactionsClient />)
  expect(await screen.findByText('We couldn’t load your transactions')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
})

it('loads a shared detail link and handles a missing transaction', async () => {
  mocks.params = 'q=Netflix&page=2&transaction=missing'
  mocks.getTransaction.mockRejectedValue(new ApiError(404, 'NOT_FOUND', 'Missing'))
  mocks.getTransactions.mockResolvedValue({
    data: [],
    meta: { page: 2, limit: 20, total: 21, totalPages: 2 },
  })
  render(<TransactionsClient />)
  expect(await screen.findByText('Transaction not found')).toBeInTheDocument()
  expect(mocks.getTransaction).toHaveBeenCalledWith(
    'missing',
    expect.objectContaining({ signal: expect.any(AbortSignal) })
  )
})

it('keeps search in the URL and resets the page when a filter changes', () => {
  mocks.params = 'q=Netflix&page=2&__scenario=slow'
  render(<TransactionsClient />)
  fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'failed' } })
  expect(mocks.push).toHaveBeenCalledWith('/transactions?q=Netflix&__scenario=slow&status=failed', {
    scroll: false,
  })
})

it('clamps an out-of-range direct page link instead of showing a false empty state', async () => {
  mocks.params = 'page=999'
  mocks.getTransactions.mockResolvedValue({
    data: [],
    meta: { page: 999, limit: 20, total: 237, totalPages: 12 },
  })
  render(<TransactionsClient />)
  await screen.findByRole('status', { name: 'Loading transactions' })
  await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith('/transactions?page=12', { scroll: false }))
})
