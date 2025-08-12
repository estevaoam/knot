import { Deposit, Withdraw } from './events'

export type Transaction = { type: 'deposit' | 'withdraw'; amount: number }

export class BankAccount {
  id: string
  transactions: Transaction[]
  observedBalance: number

  constructor(id: string, transactions: Transaction[] = []) {
    this.id = id
    this.transactions = transactions

    this.observedBalance = 0
  }

  static randomId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
  }

  static generateTransactionsForAccount(minTx = 10, maxTx = 150): Transaction[] {
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

  static generateMany(count = 50, minTx = 10, maxTx = 150): BankAccount[] {
    const accounts: BankAccount[] = []
    for (let i = 0; i < count; i++) {
      const accountId = BankAccount.randomId('acct')
      const transactions = BankAccount.generateTransactionsForAccount(minTx, maxTx)
      accounts.push(new BankAccount(accountId, transactions))
    }

    return accounts
  }

  getExpectedBalance() {
    let balance = 0

    for (const t of this.transactions) {
      balance += t.type === 'deposit' ? t.amount : -t.amount
    }

    return balance
  }

  validateBalance() {
    const expected = this.getExpectedBalance()
    const actual = this.observedBalance

    const match = expected === actual
    const line = `${this.id}: expected=${expected} actual=${actual}`

    return { line, match }
  }

  applyEvent(event: Deposit | Withdraw, bootstrapId = 'bootstrap') {
    const payload = (event as Deposit | Withdraw).payload as { accountId: string; amount: number }

    if (payload.accountId === bootstrapId) return false
    if (payload.accountId !== this.id) return false


    this.observedBalance = event instanceof Deposit
      ? this.observedBalance + payload.amount
      : this.observedBalance - payload.amount

    return true
  }
}


