'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ApiSuccess, PageMeta, Transaction, TransactionType } from '@/types/api'
import { Badge, Button, Drawer, Icon, Input, Money, Select } from '@/components/ui'
import { TransactionRow } from '@/components/transactions'
import { ApiError } from '@/lib/api/client'
import { getTransaction, getTransactions } from '@/lib/api/endpoints'
import { formatDate, formatDateTime, TRANSACTION_STATUS_LABELS, TRANSACTION_TYPE_LABELS } from '@/lib/format'
import { parseTransactionQuery, STATUSES, transactionHref, TYPES } from './query'
import styles from './page.module.css'

type ListResponse = ApiSuccess<Transaction[]> & { meta: PageMeta }
type DetailState =
  { kind: 'loading' } | { kind: 'ready'; transaction: Transaction } | { kind: 'missing' } | { kind: 'error' }

const CREDIT_TYPES: readonly TransactionType[] = ['deposit', 'transfer_in', 'conversion']
const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  ...TYPES.map((value) => ({ value, label: TRANSACTION_TYPE_LABELS[value] })),
]
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...STATUSES.map((value) => ({ value, label: TRANSACTION_STATUS_LABELS[value] })),
]

function dayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return formatDate(iso)
}

function groupedTransactions(transactions: Transaction[]) {
  const groups: { label: string; transactions: Transaction[] }[] = []
  for (const transaction of transactions) {
    const label = dayLabel(transaction.createdAt)
    if (groups.at(-1)?.label !== label) groups.push({ label, transactions: [] })
    groups.at(-1)!.transactions.push(transaction)
  }
  return groups
}

function Skeleton() {
  return (
    <div className={styles.listCard} role="status" aria-label="Loading transactions">
      <div className={styles.skeletonHeading} />
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className={styles.skeletonRow}>
          <span className={styles.skeletonIcon} />
          <span className={styles.skeletonText}>
            <i />
            <i />
          </span>
          <span className={styles.skeletonEnd}>
            <i />
            <i />
          </span>
        </div>
      ))}
    </div>
  )
}

function Message({
  icon,
  title,
  description,
  action,
}: {
  icon: 'search' | 'inbox' | 'alert'
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className={styles.message} role={icon === 'alert' ? 'alert' : 'status'}>
      <span className={icon === 'alert' ? styles.messageIconError : styles.messageIcon}>
        <Icon name={icon} size={22} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  )
}

function PageNumbers({
  page,
  totalPages,
  goToPage,
  disabled,
}: {
  page: number
  totalPages: number
  goToPage: (page: number) => void
  disabled: boolean
}) {
  const candidates = new Set(
    [1, totalPages, page - 1, page, page + 1].filter((value) => value >= 1 && value <= totalPages)
  )
  const numbers = [...candidates].sort((a, b) => a - b)
  return (
    <div className={styles.pageNumbers}>
      {numbers.map((number, index) => (
        <span key={number} className={styles.pageNumberSlot}>
          {index > 0 && number - numbers[index - 1] > 1 && <span aria-hidden="true">…</span>}
          <button
            type="button"
            disabled={disabled}
            className={number === page ? styles.currentPage : styles.pageNumber}
            onClick={() => goToPage(number)}
            aria-label={`Page ${number}`}
            aria-current={number === page ? 'page' : undefined}
          >
            {number}
          </button>
        </span>
      ))}
    </div>
  )
}

function SearchField({ value, onCommit }: { value: string; onCommit: (value: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    const next = draft.trim()
    if (next === value) return
    const timer = window.setTimeout(() => onCommit(next), 350)
    return () => window.clearTimeout(timer)
  }, [draft, value, onCommit])
  return (
    <Input
      label="Search"
      leadingIcon="search"
      placeholder="Search by reference, name or narration"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      fieldClassName={styles.searchField}
    />
  )
}

function TransactionDetails({
  state,
  onRetry,
  onBack,
}: {
  state: DetailState
  onRetry: () => void
  onBack: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (state.kind === 'loading')
    return (
      <div className={styles.detailsLoading} role="status" aria-label="Loading transaction details">
        <span />
        <i />
        <i />
        <hr />
        <i />
        <i />
        <i />
      </div>
    )
  if (state.kind === 'missing')
    return (
      <Message
        icon="search"
        title="Transaction not found"
        description="It may have been removed, or the link is wrong."
        action={
          <Button variant="secondary" onClick={onBack}>
            Back to transactions
          </Button>
        }
      />
    )
  if (state.kind === 'error')
    return (
      <Message
        icon="alert"
        title="We couldn’t load this transaction"
        description="Check your connection and try again."
        action={
          <Button iconLeft="refresh" onClick={onRetry}>
            Try again
          </Button>
        }
      />
    )

  const tx = state.transaction
  const isCredit = CREDIT_TYPES.includes(tx.type)
  const initials = tx.counterparty
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
  const copyReference = async () => {
    try {
      await navigator.clipboard.writeText(tx.reference)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className={styles.details}>
      <div className={styles.detailsHero}>
        <span className={styles.detailsAvatar} aria-hidden="true">
          {initials || (
            <Icon
              name={tx.type === 'card_payment' ? 'card' : tx.type === 'bill_payment' ? 'receipt' : 'wallet'}
              size={24}
            />
          )}
        </span>
        <p>{tx.narration}</p>
        <Money
          amount={tx.amount}
          currency={tx.currency}
          sign={isCredit ? 'credit' : 'debit'}
          className={styles.detailsAmount}
        />
        <Badge
          tone={tx.status === 'successful' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}
          dot
        >
          {TRANSACTION_STATUS_LABELS[tx.status]}
        </Badge>
      </div>
      <section className={styles.detailsSection} aria-labelledby="details-label">
        <h3 id="details-label">Details</h3>
        <dl>
          <div>
            <dt>Reference</dt>
            <dd className={styles.reference}>
              <span>{tx.reference}</span>
              <button
                type="button"
                onClick={copyReference}
                aria-label={copied ? 'Reference copied' : 'Copy reference'}
                title={copied ? 'Copied' : 'Copy reference'}
              >
                <Icon name="copy" size={16} />
              </button>
            </dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{formatDateTime(tx.createdAt)}</dd>
          </div>
          <div>
            <dt>Type</dt>
            <dd>{TRANSACTION_TYPE_LABELS[tx.type]}</dd>
          </div>
          {tx.counterparty && (
            <div>
              <dt>Counterparty</dt>
              <dd>{tx.counterparty}</dd>
            </div>
          )}
          <div>
            <dt>Narration</dt>
            <dd>{tx.narration}</dd>
          </div>
        </dl>
      </section>
      <section className={styles.detailsSection} aria-labelledby="summary-label">
        <h3 id="summary-label">Summary</h3>
        <dl>
          <div>
            <dt>Amount</dt>
            <dd>
              <Money amount={tx.amount} currency={tx.currency} />
            </dd>
          </div>
          <div>
            <dt>Fee</dt>
            <dd>
              <Money amount={tx.fee} currency={tx.currency} />
            </dd>
          </div>
          <div className={styles.total}>
            <dt>Total</dt>
            <dd>
              <Money amount={tx.amount + tx.fee} currency={tx.currency} />
            </dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

export function TransactionsClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.toString()
  const query = useMemo(() => parseTransactionQuery(new URLSearchParams(currentQuery)), [currentQuery])
  const [searchReset, setSearchReset] = useState(0)
  const [listState, setListState] = useState<{ key: string; result: ListResponse | null; error: boolean }>({
    key: '',
    result: null,
    error: false,
  })
  const [listAttempt, setListAttempt] = useState(0)
  const [detailState, setDetailState] = useState<{ key: string; detail: DetailState }>({
    key: '',
    detail: { kind: 'loading' },
  })
  const [detailAttempt, setDetailAttempt] = useState(0)
  const listKey = JSON.stringify([
    query.page,
    query.q,
    query.type,
    query.status,
    searchParams.get('__scenario'),
    listAttempt,
  ])
  const detailKey = JSON.stringify([query.transactionId, detailAttempt])
  const result = listState.result
  const listLoading = listState.key !== listKey
  const listError = !listLoading && listState.error
  const detail = detailState.key === detailKey ? detailState.detail : ({ kind: 'loading' } as DetailState)

  const navigate = useCallback(
    (patch: Record<string, string | null>, mode: 'push' | 'replace' = 'push') => {
      router[mode](transactionHref(currentQuery, patch), { scroll: false })
    },
    [currentQuery, router]
  )

  const commitSearch = useCallback(
    (value: string) => navigate({ q: value || null, page: null }, 'replace'),
    [navigate]
  )

  useEffect(() => {
    const controller = new AbortController()
    getTransactions(
      { page: query.page, q: query.q, type: query.type, status: query.status },
      { signal: controller.signal }
    )
      .then((response) => {
        if (!response.meta) throw new Error('Missing pagination data')
        if (query.page > response.meta.totalPages) {
          router.replace(
            transactionHref(window.location.search, { page: String(response.meta.totalPages) }),
            {
              scroll: false,
            }
          )
          return
        }
        setListState({ key: listKey, result: response as ListResponse, error: false })
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setListState((previous) => ({ key: listKey, result: previous.result, error: true }))
      })
    return () => controller.abort()
  }, [query.page, query.q, query.type, query.status, listKey, router])

  useEffect(() => {
    if (!query.transactionId) return
    const controller = new AbortController()
    getTransaction(query.transactionId, { signal: controller.signal })
      .then((response) =>
        setDetailState({ key: detailKey, detail: { kind: 'ready', transaction: response.data } })
      )
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setDetailState({
          key: detailKey,
          detail: error instanceof ApiError && error.status === 404 ? { kind: 'missing' } : { kind: 'error' },
        })
      })
    return () => controller.abort()
  }, [query.transactionId, detailKey])

  const hasFilters = Boolean(query.q || query.type || query.status)
  const total = result?.meta.total
  const groups = result ? groupedTransactions(result.data) : []
  const displayPage = listLoading && result ? result.meta.page : query.page
  const goToPage = (page: number) => navigate({ page: page === 1 ? null : String(page) })
  const clearFilters = () => {
    setSearchReset((value) => value + 1)
    navigate({ q: null, type: null, status: null, page: null })
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.title}>Transactions</h1>
        <p className={styles.subtitle} aria-live="polite">
          {listError
            ? 'Unable to load transactions'
            : total === undefined
              ? 'Loading transactions…'
              : hasFilters && total === 0
                ? '0 results'
                : `${total.toLocaleString()} ${hasFilters ? 'results' : total === 1 ? 'transaction' : 'transactions'}`}
        </p>
      </header>

      <div className={styles.filters}>
        <SearchField key={`${query.q}:${searchReset}`} value={query.q} onCommit={commitSearch} />
        <Select
          label="Type"
          options={TYPE_OPTIONS}
          value={query.type ?? ''}
          onChange={(event) => navigate({ type: event.target.value || null, page: null })}
          fieldClassName={styles.typeField}
        />
        <Select
          label="Status"
          options={STATUS_OPTIONS}
          value={query.status ?? ''}
          onChange={(event) => navigate({ status: event.target.value || null, page: null })}
          fieldClassName={styles.statusField}
        />
        {hasFilters && (
          <Button variant="ghost" className={styles.clearFilters} onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <div className={styles.listArea} aria-busy={listLoading}>
        {listError ? (
          <Message
            icon="alert"
            title="We couldn’t load your transactions"
            description="Check your connection and try again."
            action={
              <Button iconLeft="refresh" onClick={() => setListAttempt((attempt) => attempt + 1)}>
                Try again
              </Button>
            }
          />
        ) : !result ? (
          <Skeleton />
        ) : result.data.length === 0 ? (
          <Message
            icon={hasFilters ? 'search' : 'inbox'}
            title={hasFilters ? 'No transactions match your filters' : 'No transactions yet'}
            description={
              hasFilters
                ? 'Try a different search term or remove some filters.'
                : 'When you add money, send a transfer or pay with your card, it will show up here.'
            }
            action={
              hasFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={styles.listCard}>
            {groups.map((group, index) => (
              <section key={`${group.label}-${index}`}>
                <h2 className={styles.groupTitle}>{group.label}</h2>
                {group.transactions.map((tx) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    onSelect={() => navigate({ transaction: tx.id })}
                  />
                ))}
              </section>
            ))}
          </div>
        )}
      </div>

      {!listError && result && result.meta.total > 0 && (
        <div className={styles.pagination}>
          <p>
            Showing {(displayPage - 1) * result.meta.limit + 1}–
            {Math.min(displayPage * result.meta.limit, result.meta.total)} of{' '}
            {result.meta.total.toLocaleString()}
          </p>
          <div className={styles.paginationControls}>
            <Button
              variant="secondary"
              iconLeft="chevron-left"
              disabled={displayPage <= 1 || listLoading}
              onClick={() => goToPage(displayPage - 1)}
            >
              <span className={styles.previousDesktop}>Previous</span>
              <span className={styles.previousMobile}>Prev</span>
            </Button>
            <PageNumbers
              page={displayPage}
              totalPages={result.meta.totalPages}
              goToPage={goToPage}
              disabled={listLoading}
            />
            <span className={styles.mobilePageCount}>
              Page {displayPage} of {result.meta.totalPages}
            </span>
            <Button
              variant="secondary"
              iconRight="chevron-right"
              disabled={displayPage >= result.meta.totalPages || listLoading}
              onClick={() => goToPage(displayPage + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Drawer
        open={Boolean(query.transactionId)}
        title="Transaction details"
        onClose={() => navigate({ transaction: null }, 'replace')}
      >
        <TransactionDetails
          state={detail}
          onRetry={() => setDetailAttempt((attempt) => attempt + 1)}
          onBack={() => navigate({ transaction: null }, 'replace')}
        />
      </Drawer>
    </div>
  )
}
