import { Kafka, logLevel, Producer, Consumer } from 'kafkajs'
import {
  MessageBrokerAdapter,
  MessageBrokerProducer,
  MessageBrokerConsumer,
  Message,
} from '@vortex/core'

export class KafkaAdapter implements MessageBrokerAdapter {
  private kafka: Kafka

  constructor() {
    const brokers = (process.env.KAFKA_BROKER_URL || '').split(',').filter(Boolean)

    const devConfig = {
      brokers,
      logLevel: logLevel.ERROR as const,
    }

    const config = {
      ...devConfig,
      ssl: true,
      sasl: {
        mechanism: 'scram-sha-256' as const,
        username: process.env.KAFKA_USERNAME,
        password: process.env.KAFKA_PASSWORD,
      },
    }

    this.kafka = new Kafka(
      process.env.NODE_ENV === 'development' ? devConfig : (config as any)
    )
  }

  producer(): MessageBrokerProducer {
    const producer: Producer = this.kafka.producer()

    return {
      connect: () => producer.connect(),
      send: async ({ topic, messages }: { topic: string; messages: Message[] }) => {
        await producer.send({ topic, messages })
      },
      disconnect: () => producer.disconnect(),
    }
  }

  consumer(config: { groupId: string }): MessageBrokerConsumer {
    const consumer: Consumer = this.kafka.consumer(config)

    return {
      connect: () => consumer.connect(),
      subscribe: ({ topics, fromBeginning }: { topics: string[]; fromBeginning: boolean }) =>
        Promise.all(
          topics.map((topic) =>
            consumer.subscribe({ topic, fromBeginning })
          )
        ).then(() => void 0),
      run: async ({
        eachMessage,
      }: {
        eachMessage: (args: {
          topic: string
          partition: number
          message: { value: Buffer; offset: string }
        }) => Promise<void>
      }) => {
        await consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return
            await eachMessage({
              topic,
              partition,
              message: { value: message.value, offset: message.offset },
            })
          },
        })
      },
      on: (event: string, handler: (...args: any[]) => void) => {
        ; (consumer as any).on(event, handler)
      },
      disconnect: () => consumer.disconnect(),
    }
  }
} 