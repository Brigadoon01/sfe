import { parseTransactionQuery, transactionHref } from './query'

describe('transaction URL state', () => {
  it('accepts supported filters and rejects invalid values', () => {
    expect(
      parseTransactionQuery(
        new URLSearchParams('page=3&type=transfer_out&status=failed&q=kwame&transaction=txn_1')
      )
    ).toEqual({
      page: 3,
      type: 'transfer_out',
      status: 'failed',
      q: 'kwame',
      transactionId: 'txn_1',
    })
    expect(parseTransactionQuery(new URLSearchParams('page=-2&type=unknown&status=reversed'))).toEqual({
      page: 1,
      type: undefined,
      status: undefined,
      q: '',
      transactionId: null,
    })
  })

  it('preserves selections and scenario when opening or closing details', () => {
    const current = 'q=Netflix&type=card_payment&page=2&__scenario=slow'
    const opened = transactionHref(current, { transaction: 'txn_1' })
    expect(opened).toContain('q=Netflix')
    expect(opened).toContain('page=2')
    expect(opened).toContain('__scenario=slow')
    expect(transactionHref(opened.split('?')[1], { transaction: null })).toBe(`/transactions?${current}`)
  })
})
