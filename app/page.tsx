'use client'
import { useEffect, useState } from 'react'
import type { User } from '@/types/api'
import { BalanceSummary, RatesWidget, RecentTransactions, WalletCard } from '@/components/dashboard'
import { Button } from '@/components/ui'
import { getMe } from '@/lib/api/endpoints'
import styles from './page.module.css'

export default function DashboardPage() {
  const [user, setUser] = useState<User>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    getMe()
      .then((res) => setUser(res.data))
      .catch(() => setError(true))
      .finally(() => setIsLoading(false))
  }, [attempt])

  if (isLoading) return <p className={styles.loading}>Loading…</p>
  if (error)
    return (
      <div>
        <p>We couldn’t load your dashboard.</p>
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
    )

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Welcome back, {user!.firstName}</h1>
        <p className={styles.subtitle}>Here&apos;s what&apos;s happening with your money today.</p>
      </header>

      <BalanceSummary wallets={user!.wallets} />

      <div className={styles.wallets}>
        {user!.wallets.map((wallet) => (
          <WalletCard key={wallet.currency} wallet={wallet} />
        ))}
      </div>

      <div className={styles.columns}>
        <RecentTransactions />
        <RatesWidget base="NGN" />
      </div>
    </div>
  )
}
