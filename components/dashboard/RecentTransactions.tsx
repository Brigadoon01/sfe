'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Transaction } from '@/types/api'
import { Button, Card, CardHeader, Drawer, Money } from '@/components/ui'
import { TransactionRow } from '@/components/transactions'
import { getTransactions } from '@/lib/api/endpoints'
import { formatDateTime, TRANSACTION_STATUS_LABELS } from '@/lib/format'
import styles from './RecentTransactions.module.css'

export function RecentTransactions() {
  const [selected, setSelected] = useState<Transaction | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    getTransactions({ limit: 5 })
      .then((res) => setTransactions(res.data))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false))
  }, [attempt])

  return (
    <Card padding="none">
      <div className={styles.header}>
        <CardHeader
          title="Recent transactions"
          action={
            <Link href="/transactions" className={styles.seeAll}>
              See all
            </Link>
          }
        />
      </div>
      {isLoading && <p className={styles.message}>Loading…</p>}
      {error && (
        <div className={styles.message}>
          <p>Couldn’t load recent transactions.</p>
          <Button
            onClick={() => {
              setError(false)
              setIsLoading(true)
              setAttempt((value) => value + 1)
            }}
          >
            Try again
          </Button>
        </div>
      )}
      {!isLoading && !error && !transactions?.length && (
        <p className={styles.message}>No transactions yet.</p>
      )}
      {!error &&
        transactions?.map((tx) => <TransactionRow key={tx.id} transaction={tx} onSelect={setSelected} />)}

      <Drawer open={selected !== null} title="Transaction details" onClose={() => setSelected(null)}>
        {selected && (
          <dl className={styles.details}>
            <dt>Reference</dt>
            <dd>{selected.reference}</dd>
            <dt>Amount</dt>
            <dd>
              <Money amount={selected.amount} currency={selected.currency} />
            </dd>
            <dt>Status</dt>
            <dd>{TRANSACTION_STATUS_LABELS[selected.status]}</dd>
            <dt>Date</dt>
            <dd>{formatDateTime(selected.createdAt)}</dd>
          </dl>
        )}
      </Drawer>
    </Card>
  )
}
