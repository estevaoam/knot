import { Kafka, logLevel, Producer, Consumer } from 'kafkajs'
import {
  MessageBrokerAdapter,
  MessageBrokerProducer,
  MessageBrokerConsumer,
  Message,
} from '@vortex/core'

export interface KafkaAdapterOptions {
  brokers: string[]
  username?: string
  password?: string
  ssl?: boolean
  saslMechanism?: 'scram-sha-256' | 'scram-sha-512'
  logLevel?: import('kafkajs').logLevel
}

export class KafkaAdapter implements MessageBrokerAdapter {
  private kafka: Kafka

  constructor({
    brokers,
    username,
    password,
    ssl = false,
    saslMechanism = 'scram-sha-256',
    logLevel: logLevelSetting = logLevel.ERROR,
  }: KafkaAdapterOptions) {
    const baseConfig: any = {
      brokers,
      logLevel: logLevelSetting,
    }

    if (ssl) {
      baseConfig.ssl = true
    }

    if (username && password) {
      baseConfig.sasl = {
        mechanism: saslMechanism,
        username,
        password,
      }
    }

    this.kafka = new Kafka(baseConfig)
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
      run: async ({ eachMessage }: {
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