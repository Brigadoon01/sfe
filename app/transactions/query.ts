import type { TransactionStatus, TransactionType } from '@/types/api'

export const TYPES: readonly TransactionType[] = [
  'deposit',
  'withdrawal',
  'transfer_in',
  'transfer_out',
  'conversion',
  'card_payment',
  'bill_payment',
]
export const STATUSES: readonly TransactionStatus[] = ['successful', 'pending', 'failed']

export function parseTransactionQuery(params: URLSearchParams) {
  const rawPage = Number(params.get('page'))
  const rawType = params.get('type')
  const rawStatus = params.get('status')
  return {
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
    q: params.get('q')?.trim() ?? '',
    type: TYPES.find((type) => type === rawType),
    status: STATUSES.find((status) => status === rawStatus),
    transactionId: params.get('transaction') || null,
  }
}

export function transactionHref(current: string, patch: Record<string, string | null>) {
  const params = new URLSearchParams(current)
  for (const [key, value] of Object.entries(patch)) {
    if (value) params.set(key, value)
    else params.delete(key)
  }
  const query = params.toString()
  return `/transactions${query ? `?${query}` : ''}`
}
