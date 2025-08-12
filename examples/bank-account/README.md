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
- `examples/bank-account/data.ts`: fake data generation and balance validation
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

`main.ts` declares a small handler used in `consume` to update the in‑memory balances and count processed events.

```33:45:examples/bank-account/main.ts
const updateAccountBalance = (event: Deposit | Withdraw) => {
  const payload: DepositPayload | WithdrawPayload = (event as Deposit | Withdraw).payload

  if (payload.accountId === 'bootstrap') return
  if (!targetAccountIds.has(payload.accountId)) return

  const current = observedBalances.get(payload.accountId) ?? 0
  const next = event instanceof Deposit ? current + payload.amount : current - payload.amount

  observedBalances.set(payload.accountId, next)

  processedEvents += 1
}
```

```47:53:examples/bank-account/main.ts
const allEventsProcessed = new Promise<void>((resolve) => {
  consume([Deposit, Withdraw], (event) => {
    updateAccountBalance(event as Deposit | Withdraw)
    if (processedEvents >= totalEvents) resolve()
  })
})
```

### Produce events

Each generated transaction is turned into a `Deposit` or `Withdraw` event and produced individually.

```57:65:examples/bank-account/main.ts
for (const { accountId, transactions } of accounts) {
  for (const transaction of transactions) {
    const eventToProduce = transaction.type === 'deposit'
      ? new Deposit({ accountId, amount: transaction.amount })
      : new Withdraw({ accountId, amount: transaction.amount })

    await produce({ event: eventToProduce })
  }
}
```

### Validate results

Validation compares the observed balances (from consumed events) with the expected balances (derived from the generated transactions).

```69:73:examples/bank-account/main.ts
const { lines, allMatch } = validateBalances(observedBalances, expectedBalances)

console.log('Final balances:')
for (const l of lines) console.log(' - ' + l)
console.log(`Validation: ${allMatch ? 'OK' : 'MISMATCH'}`)
```

That’s it — define events, plug in the Kafka adapter, produce, consume, and validate.


