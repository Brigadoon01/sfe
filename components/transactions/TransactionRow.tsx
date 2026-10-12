import type { Transaction, TransactionType } from '@/types/api'
import { Badge, Icon, type IconName, Money } from '@/components/ui'
import { formatTime, TRANSACTION_STATUS_LABELS, TRANSACTION_TYPE_LABELS } from '@/lib/format'
import styles from './TransactionRow.module.css'

const TYPE_ICONS: Record<TransactionType, IconName> = {
  deposit: 'arrow-down-left',
  transfer_in: 'arrow-down-left',
  withdrawal: 'arrow-up-right',
  transfer_out: 'arrow-up-right',
  conversion: 'swap',
  card_payment: 'card',
  bill_payment: 'receipt',
}

const CREDIT_TYPES: TransactionType[] = ['deposit', 'transfer_in', 'conversion']

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

export interface TransactionRowProps {
  transaction: Transaction
  onSelect?: (transaction: Transaction) => void
}

export function TransactionRow({ transaction: tx, onSelect }: TransactionRowProps) {
  const isCredit = CREDIT_TYPES.includes(tx.type)
  const isTransfer = tx.type === 'transfer_in' || tx.type === 'transfer_out'

  return (
    <button type="button" className={styles.row} onClick={() => onSelect?.(tx)}>
      <span className={styles.icon} aria-hidden="true">
        {isTransfer && tx.counterparty ? (
          initials(tx.counterparty)
        ) : (
          <Icon name={TYPE_ICONS[tx.type]} size={18} />
        )}
      </span>
      <span className={styles.main}>
        <span className={styles.title}>{TRANSACTION_TYPE_LABELS[tx.type]}</span>
        <span className={styles.narration}>{tx.narration}</span>
      </span>
      <Badge
        tone={tx.status === 'successful' ? 'success' : tx.status === 'pending' ? 'warning' : 'danger'}
        dot
        className={styles.status}
      >
        {TRANSACTION_STATUS_LABELS[tx.status]}
      </Badge>
      <span className={styles.end}>
        <Money
          amount={tx.amount}
          currency={tx.currency}
          sign={isCredit ? 'credit' : 'debit'}
          className={isCredit ? styles.credit : styles.amount}
        />
        <span className={styles.meta}>{formatTime(tx.createdAt)}</span>
      </span>
    </button>
  )
}
