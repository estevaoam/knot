export type Transaction = { type: 'deposit' | 'withdraw'; amount: number }
export type AccountTransactions = { accountId: string; transactions: Transaction[] }

export const randomId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`

export const generateTransactionsForAccount = (minTx = 5, maxTx = 10): Transaction[] => {
  const numTransactions = Math.floor(Math.random() * (maxTx - minTx + 1)) + minTx
  let currentBalance = 0
  const transactions: Transaction[] = []

  for (let i = 0; i < numTransactions; i++) {
    const mustDeposit = currentBalance === 0
    const willDeposit = mustDeposit || Math.random() < 0.6
    if (willDeposit) {
      const amount = Math.floor(Math.random() * 90) + 10
      transactions.push({ type: 'deposit', amount })
      currentBalance += amount
    } else {
      const maxWithdraw = Math.max(1, currentBalance)
      const amount = Math.floor(Math.random() * maxWithdraw) || 1
      const boundedAmount = Math.min(amount, currentBalance)
      transactions.push({ type: 'withdraw', amount: boundedAmount })
      currentBalance -= boundedAmount
    }
  }

  return transactions
}

export const generateAccountsWithTransactions = (): AccountTransactions[] => {
  const ACCOUNT_COUNT = 4
  const MIN_TX = 5
  const MAX_TX = 10

  const accounts: AccountTransactions[] = []
  for (let i = 0; i < ACCOUNT_COUNT; i++) {
    const accountId = randomId('acct')
    const transactions = generateTransactionsForAccount(MIN_TX, MAX_TX)
    accounts.push({ accountId, transactions })
  }
  return accounts
}

export const validateBalances = (
  observed: Map<string, number>,
  expected: Map<string, number>
) => {
  const lines: string[] = []
  let allMatch = true
  for (const [accountId, exp] of expected.entries()) {
    const act = observed.get(accountId) ?? 0
    if (exp !== act) allMatch = false
    lines.push(`${accountId}: expected=${exp} actual=${act}`)
  }
  return { lines, allMatch }
}

export const computeExpectedBalances = (accounts: AccountTransactions[]) => {
  const balances = new Map<string, number>()
  for (const { accountId, transactions } of accounts) {
    let balance = 0
    for (const t of transactions) {
      balance += t.type === 'deposit' ? t.amount : -t.amount
    }
    balances.set(accountId, balance)
  }
  return balances
}


