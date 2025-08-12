import { Deposit, Withdraw } from './events'
import { Knot } from '../../packages/core/index'
import { KafkaAdapter } from '../../packages/kafka-adapter/index'
import { BankAccount } from './bank-account'

const main = async () => {
  const knot = new Knot({
    adapter: new KafkaAdapter({ brokers: ['localhost:9092'] }),
  })

  const accounts = BankAccount.generateMany()
  const totalEvents = accounts.reduce((acc, a) => acc + a.transactions.length, 0)
  const accountById = new Map(accounts.map((a) => [a.id, a]))

  const topic = Deposit.aggregateRoot
  const groupId = `bank-analytics-${Date.now()}`

  console.log('Bank Account demo with Knot + Kafka')
  console.log(`Brokers: localhost:9092`)
  console.log(`Topic: ${topic}`)
  console.log(`Consumer group: ${groupId}`)

  const { produce } = knot.producer()

  await produce({ event: new Deposit({ accountId: 'bootstrap', amount: 0 }) })

  const { consume, start } = knot.consumer(groupId)

  let processedEvents = 0

  const allEventsProcessed = new Promise<void>((resolve) => {
    consume([Deposit, Withdraw], (event) => {
      console.log(`Consumed event: ${event.payload.accountId} ${event.payload.amount}`)
      const payload = event.payload
      const account = accountById.get(payload.accountId)
      if (!account) return

      const updated = account.applyEvent(event)

      if (updated) {
        processedEvents += 1
        if (processedEvents >= totalEvents) resolve()
      }
    })
  })

  await start()

  console.log(`Producing ${totalEvents} events...`)
  for (const { id, transactions } of accounts) {
    for (const transaction of transactions) {
      const eventToProduce = transaction.type === 'deposit'
        ? new Deposit({ accountId: id, amount: transaction.amount })
        : new Withdraw({ accountId: id, amount: transaction.amount })

      produce({ event: eventToProduce })
      console.log(`Produced event: ${eventToProduce.payload.accountId} ${eventToProduce.payload.amount}`)
    }
  }

  console.log('Waiting for all events to be processed...')
  await allEventsProcessed

  const perAccount = accounts.map((a) => a.validateBalance())
  const lines = perAccount.map((r) => r.line)
  const allMatch = perAccount.every((r) => r.match)

  console.log('Final balances:')
  for (const l of lines) console.log(' - ' + l)
  console.log(`Validation: ${allMatch ? 'OK' : 'MISMATCH'}`)

  process.exit(allMatch ? 0 : 1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


