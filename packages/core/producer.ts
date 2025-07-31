import Event from './event'
import { getMessageBrokerAdapter } from './broker'

type ProduceParams<T> = {
  event?: Event<T>
  events?: Event<T>[]
}

type Message = {
  key: string
  value: Buffer
}

type MessagesPerTopic = Record<string, Message[]>

export const useProducer = () => {
  // Produces an event
  return {
    produce: async <T>({ event, events }: ProduceParams<T>) => {
      const messagesPerTopic: MessagesPerTopic = {}
      if (!events) {
        if (event) {
          events = [event]
        } else {
          throw new Error('produce requires "event" or "events" parameter')
        }
      }

      for (const event of events) {
        const eventClass = Object.getPrototypeOf(event).constructor
        const topic = eventClass.aggregateRoot
        const routingKey = eventClass.routingKey
        const payload = event.payload

        if (!messagesPerTopic[topic]) {
          messagesPerTopic[topic] = []
        }

        const metadata = {
          event: eventClass.name.toString(),
          producedAt: new Date().toISOString(),
        }

        messagesPerTopic[topic].push({
          key: (payload as any)[routingKey].toString(),
          value: Buffer.from(JSON.stringify({ payload, metadata })),
        })
      }

      if (process.env.KAFKA_DISABLE && process.env.KAFKA_DISABLE === 'true') {
        console.debug('Kafka is disabled')
      } else {
        console.debug('Producing message')

        for (const [topic, messages] of Object.entries(messagesPerTopic)) {
          console.debug({ topic, messages })

          const adapter = getMessageBrokerAdapter()
          const producer = adapter.producer()

          await producer.connect()
          await producer.send({
            topic,
            messages,
          })
        }
      }
    },
  }
}
