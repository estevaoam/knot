import Event from './event'
import type { MessageBrokerAdapter } from './message-broker'

export interface ProducerOptions {
  disableProducer?: boolean
}

type ProduceParams<T> = {
  event?: Event<T>
  events?: Event<T>[]
}

type Message = {
  key: string
  value: Buffer
}

type MessagesPerTopic = Record<string, Message[]>

export const useProducer = (
  adapter: MessageBrokerAdapter,
  { disableProducer = false }: ProducerOptions = {}
) => {
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

      if (disableProducer) {
        console.debug('Producing is disabled')
      } else {
        console.debug('Producing message')

        for (const [topic, messages] of Object.entries(messagesPerTopic)) {
          console.debug({ topic, messages })

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
