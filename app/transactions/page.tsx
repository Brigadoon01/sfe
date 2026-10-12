import { Suspense } from 'react'
import type { Metadata } from 'next'
import { TransactionsClient } from './TransactionsClient'
import styles from './page.module.css'

export const metadata: Metadata = { title: 'Transactions' }

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <h1 className={styles.title}>Transactions</h1>
          <p className={styles.subtitle}>Loading transactions…</p>
        </div>
      }
    >
      <TransactionsClient />
    </Suspense>
  )
}
