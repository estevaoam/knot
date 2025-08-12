import { Deposit, Withdraw, type DepositPayload, type WithdrawPayload } from './events'
import { Knot } from '../../packages/core/index'
import { KafkaAdapter } from '../../packages/kafka-adapter/index'
import { generateAccountsWithTransactions, computeExpectedBalances, validateBalances } from './data'

const main = async () => {
  const knot = new Knot({
    adapter: new KafkaAdapter({ brokers: ['localhost:9092'] }),
  })

  const accounts = generateAccountsWithTransactions()
  const expectedBalances = computeExpectedBalances(accounts)
  const totalEvents = accounts.reduce((acc, a) => acc + a.transactions.length, 0)
  const targetAccountIds = new Set(accounts.map((a) => a.accountId))

  const topic = Deposit.aggregateRoot
  const groupId = `bank-analytics-${Date.now()}`

  console.log('Bank Account demo with Knot + Kafka')
  console.log(`Brokers: localhost:9092`)
  console.log(`Topic: ${topic}`)
  console.log(`Consumer group: ${groupId}`)

  const { produce } = knot.producer()

  await produce({ event: new Deposit({ accountId: 'bootstrap', amount: 0 }) })

  const { consume, start } = knot.consumer(groupId)

  const observedBalances = new Map<string, number>()
  let processedEvents = 0

  const updateAccountBalance = (event: Deposit | Withdraw) => {
    const payload: DepositPayload | WithdrawPayload = (event as Deposit | Withdraw).payload

    if (payload.accountId === 'bootstrap') return
    if (!targetAccountIds.has(payload.accountId)) return

    const current = observedBalances.get(payload.accountId) ?? 0
    const next = event instanceof Deposit ? current + payload.amount : current - payload.amount

    observedBalances.set(payload.accountId, next)

    processedEvents += 1
  }

  const allEventsProcessed = new Promise<void>((resolve) => {
    consume([Deposit, Withdraw], (event) => {
      updateAccountBalance(event as Deposit | Withdraw)

      if (processedEvents >= totalEvents) resolve()
    })
  })

  await start({ fromBeginning: true })

  for (const { accountId, transactions } of accounts) {
    for (const transaction of transactions) {
      const eventToProduce = transaction.type === 'deposit'
        ? new Deposit({ accountId, amount: transaction.amount })
        : new Withdraw({ accountId, amount: transaction.amount })

      await produce({ event: eventToProduce })
    }
  }

  await allEventsProcessed

  const { lines, allMatch } = validateBalances(observedBalances, expectedBalances)

  console.log('Final balances:')
  for (const l of lines) console.log(' - ' + l)
  console.log(`Validation: ${allMatch ? 'OK' : 'MISMATCH'}`)

  process.exit(allMatch ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


