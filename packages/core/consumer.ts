import Event from './event'
import type { MessageBrokerAdapter } from './message-broker'
import type { Logger } from './logger'
import { defaultLogger } from './logger'

export interface ConsumerOptions {
  consumerGroupNamespace?: string
  logger?: Logger
}

type EitherEvent<T extends any[]> = T[number]
type ArrayOfEvents = Array<typeof Event<any>>
type EventClassConstructor<T> = new (payload: T) => Event<T>

type Mapping = {
  [topic: string]: {
    [event: string]: {
      klass: typeof Event<any>
      handlers: Array<
        (
          event: EitherEvent<Event<any>[]>,
          topic: string,
          partition: number
        ) => void
      >
    }
  }
}

type StartOptions = {
  fromBeginning?: boolean
}

const handleKafkaMessageError = (
  error: Error,
  message: string,
  topic: string,
  partition: number
) => (logger: Logger) => {
  logger.error('Error processing event')
  logger.error(error)

  logger.error('Event details:')
  logger.error(JSON.stringify({ message, topic, partition }, null, 2))
}

export const useConsumer = (
  adapter: MessageBrokerAdapter,
  groupId: string,
  { consumerGroupNamespace, logger = defaultLogger }: ConsumerOptions = {}
) => {
  const consumer = adapter.consumer({
    groupId: consumerGroupNamespace
      ? `${consumerGroupNamespace}-${groupId}`
      : groupId,
  })

  const eventMapping: Mapping = {}

  return {
    /* Starts the consumer process. All declared consumer handlers will be executed.
     * See {@link consume} to declare event handlers.
     *
     * @param {StartOptions} options - The options for starting the consumer.
     * @param {boolean} options.fromBeginning - Whether to start the consumer from the beginning of the topic.
     * @returns {Promise<void>}
     */
    start: async (
      { fromBeginning = false }: StartOptions = { fromBeginning: false }
    ) => {
      await consumer.connect()

      // Get only unique topics to subscribe to
      const topics = Array.from(new Set(Object.keys(eventMapping)))

      await consumer.subscribe({ topics, fromBeginning })
      logger.info('Subscribed to topics: ' + topics)

      consumer.on('consumer.crash', (error) => {
        logger.error('Consumer crashed')
        logger.error(error)
      })

      consumer.on('consumer.stop', async () => {
        await consumer.disconnect()
      })

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const eventMessage = JSON.parse(message.value.toString())
            const {
              metadata: { event: eventClassName },
            } = eventMessage

            logger.debug(
              `Kafka message received: ${JSON.stringify(
                {
                  topic,
                  partition,
                  event: eventClassName,
                  offset: message.offset,
                  value: eventMessage,
                },
                null,
                2
              )}`
            )

            const mapping = eventMapping[topic][eventClassName]
            if (!mapping) {
              logger.debug(`Skipping event ${eventClassName}...`)
              return
            }

            const eventClass = mapping.klass

            const EventClass = eventClass.prototype
              .constructor as EventClassConstructor<any>

            logger.debug(JSON.stringify(eventClass, null, 2))

            const { payload } = eventMessage
            const event: Event = new EventClass(payload)

            await Promise.all(
              mapping.handlers.map(async (handler) => {
                try {
                  await handler(event, topic, partition)
                } catch (error) {
                  handleKafkaMessageError(
                    error as Error,
                    message.value.toString(),
                    topic,
                    partition
                  )(logger)
                }
              })
            )
          } catch (error) {
            handleKafkaMessageError(
              error as Error,
              message.value.toString(),
              topic,
              partition
            )(logger)
          }
        },
      })
    },
    /* Declares an event handler for a given array of events.
     *
     * @param {ArrayOfEvents} events - The array of events to declare a handler for.
     * @param {function} handler - The handler function to execute when the event is received.
     * @returns {Promise<void>}
     */
    consume: async (
      events: ArrayOfEvents,
      handler: (
        event: EitherEvent<Event<any>[]>,
        topic: string,
        partition: number
      ) => void
    ) => {
      for (const event of events) {
        const topic = event.aggregateRoot

        const newEventMapping = {
          [event.name]: {
            klass: event,
            handlers: [handler],
          },
        }

        if (!eventMapping[topic]) {
          eventMapping[topic] = newEventMapping
        } else {
          if (eventMapping[topic][event.name]) {
            eventMapping[topic][event.name].handlers.push(handler)
          } else {
            eventMapping[topic] = {
              ...eventMapping[topic],
              ...newEventMapping,
            }
          }
        }
      }
    },
  }
}
