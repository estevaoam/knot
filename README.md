## 🪢 Knot

Build event‑driven applications in TypeScript with a clean, strongly‑typed API. Knot lets you define domain events once and plug in any message broker via adapters.

## ✨ Features

- **Strongly‑typed events**: model your domain with typed payloads.
- **Simple producer/consumer APIs**: minimal surface area, easy to test.
- **Broker‑agnostic core**: swap Kafka for Redis/NATS/RabbitMQ (coming soon) by changing the adapter.

## 📦 Installation

Install the core and your preferred adapter.

```bash
npm install @knot/core @knot/kafka-adapter
```

## 🚀 Quickstart

### 1) Define an event

```ts
import { Event } from '@knot/core'

type UserCreatedPayload = {
  id: string
  name: string
}

export class UserCreated extends Event<UserCreatedPayload> {
  static aggregateRoot = 'User'
  static routingKey = 'id'
}
```

### 2) Bootstrap Knot with an adapter

```ts
import { Knot } from '@knot/core'
import { KafkaAdapter } from '@knot/kafka-adapter'

const knot = new Knot({
  adapter: new KafkaAdapter({ brokers: ['localhost:9092'] }),
})
```

### 3) Produce events

```ts
import { UserCreated } from './events/UserCreated'

const { produce } = knot.producer()

const event = new UserCreated({ id: '42', name: 'Ada' })
await produce({ event })
```

### 4) Consume events

```ts
import { UserCreated } from './events/UserCreated'

const { consume, start } = knot.consumer('analytics')

// Declare a handler for the events
consume([UserCreated], async (event) => {
  const { id, name } = (event as UserCreated).payload
  console.log(id, name)
})

await start() // will start consuming from the topics
```

## 🧩 Advanced usage

### Producing multiple events

```ts
const event1 = new UserCreated({ id: '1', name: 'Ada' })
const event2 = new UserCreated({ id: '2', name: 'Linus' })

await produce({
  events: [event1, event2],
})
```

### Consumer groups and options

```ts
import { Knot } from '@knot/core'
import { KafkaAdapter } from '@knot/kafka-adapter'

const knot = new Knot({
  adapter: new KafkaAdapter({ brokers: ['localhost:9092'] }),
  consumerGroupNamespace: 'myapp',
})

const { start, consume } = knot.consumer('analytics')

// consume(...)

await start({ fromBeginning: true }) // will start consume from the beginning
```

`consumerGroupNamespace` prefixes your group IDs, helpful when running multiple environments against the same cluster.

You can also disable producing globally (useful in dry‑runs):

```ts
const knot = new Knot({
  adapter: new KafkaAdapter({ brokers: ['localhost:9092'] }),
  disableProducer: true,
})
```

### Logging

Provide your own logger by implementing the `Logger` interface and passing it to `Knot`.

```ts
import { Knot, ConsoleLogger } from '@knot/core'
import { KafkaAdapter } from '@knot/kafka-adapter'

const knot = new Knot({
  adapter: new KafkaAdapter({ brokers: ['localhost:9092'] }),
  logger: new ConsoleLogger(), // this is default, or use your own logger
})
```

### Kafka adapter

Configure the Kafka adapter with your brokers. SASL/SSL map directly to `kafkajs` options.

```ts
import { KafkaAdapter } from '@knot/kafka-adapter'

const adapter = new KafkaAdapter({
  brokers: ['localhost:9092'],
})
```

### Writing your own adapter

Your adapter should expose `producer()` and `consumer({ groupId })` compatible with your broker. See `packages/kafka-adapter` for a reference implementation.

## 📚 API (essentials)

- **Event<T>**
  - `payload: T`
  - static `aggregateRoot: string`
  - static `routingKey: string`

- **Knot(options)**
  - `adapter: MessageBrokerAdapter`
  - `disableProducer?: boolean`
  - `consumerGroupNamespace?: string`
  - `logger?: Logger`

- **producer() → { produce }**
  - `produce({ event?: Event<T>; events?: Event<T>[] }): Promise<void>`

- **consumer(groupId) → { consume, start }**
  - `consume(events: Array<typeof Event>, handler: (event, topic, partition) => Promise<void> | void): Promise<void>`
  - `start(options?: { fromBeginning?: boolean }): Promise<void>`

Messages are encoded as JSON buffers of `{ payload, metadata: { event, producedAt } }`.

## 🤝 Contributing

### Test locally

Run unit tests:

```bash
npm run test:core
```

Run integration tests against Kafka (starts the cluster locally):

```bash
docker compose -f packages/kafka-adapter/docker-compose.yml up -d
npm run test:integration
```

Run the full test suite:

```bash
npm test
```

## 📄 License

Apache-2.0
