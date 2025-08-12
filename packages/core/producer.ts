import Event from './event'
import type { MessageBrokerAdapter } from './message-broker'
import type { Logger } from './logger'
import { defaultLogger } from './logger'

export interface ProducerOptions {
  disableProducer?: boolean
  logger?: Logger
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

export const createProducer = (
  adapter: MessageBrokerAdapter,
  { disableProducer = false, logger = defaultLogger }: ProducerOptions = {}
) => {
  // Produces an event
  const produce = async <T>({ event, events }: ProduceParams<T>) => {
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
        logger.debug('Producing is disabled')
      } else {
        logger.debug('Producing message')

        for (const [topic, messages] of Object.entries(messagesPerTopic)) {
          logger.debug({ topic, messages })

          const producer = adapter.producer()

          await producer.connect()
          await producer.send({
            topic,
            messages,
          })
        }
      }
    }

  return {
    produce,
  }
}
