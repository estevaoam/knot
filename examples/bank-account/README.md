## Bank Account example (Knot + Kafka)

This example demonstrates how to use Knot to:

- Define events (`Deposit`, `Withdraw`)
- Produce events to Kafka
- Consume those events and update per‑account balances
- Validate the final balances against expected values

### Prerequisites

- Node.js 18+
- Docker running
- Start Kafka locally:

```bash
docker compose -f packages/kafka-adapter/docker-compose.yml up -d
```

### Run

```bash
npx tsx examples/bank-account/main.ts
```

You should see final balances per generated account and a validation status (OK/MISMATCH).

### Files

- `examples/bank-account/events.ts`: event definitions
- `examples/bank-account/bank-account.ts`: account model, data generation, observed-balance updates, and validation
- `examples/bank-account/main.ts`: bootstraps Knot, produces/consumes events, and prints results

### Define events

```6:14:examples/bank-account/events.ts
export class Deposit extends Event<DepositPayload> {
  static aggregateRoot = 'BankAccount'
  static routingKey = 'accountId'
}

export class Withdraw extends Event<WithdrawPayload> {
  static aggregateRoot = 'BankAccount'
  static routingKey = 'accountId'
}
```

### Bootstrap Knot (Kafka adapter)

```7:9:examples/bank-account/main.ts
const knot = new Knot({
  adapter: new KafkaAdapter({ brokers: ['localhost:9092'] }),
})
```

### Consume and update balances

`main.ts` calls the instance method `account.applyEvent(event)` to update each account's in‑memory balance and count processed events.

```31:45:examples/bank-account/main.ts
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
```

### Produce events

Each generated transaction is turned into a `Deposit` or `Withdraw` event and produced individually.

```49:58:examples/bank-account/main.ts
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
```

### Validate results

Validation compares the observed balances (from consumed events) with the expected balances (derived from the generated transactions) using per-account instance methods.

```64:70:examples/bank-account/main.ts
const perAccount = accounts.map((a) => a.validateBalance())
const lines = perAccount.map((r) => r.line)
const allMatch = perAccount.every((r) => r.match)

console.log('Final balances:')
for (const l of lines) console.log(' - ' + l)
console.log(`Validation: ${allMatch ? 'OK' : 'MISMATCH'}`)
```

That’s it — define events, plug in the Kafka adapter, produce, consume, and validate.


