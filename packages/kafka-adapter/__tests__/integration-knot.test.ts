import { Knot, Event } from '../../core/index'
import { KafkaAdapter } from '../index'
import { MessageBrokerProducer, MessageBrokerConsumer } from '../../core/message-broker'

jest.setTimeout(30000)

class UserCreated extends Event<{ id: string; name: string }> {
  static aggregateRoot = 'UserInt'
  static routingKey = 'id'
}

describe('Knot client integration (Kafka)', () => {
  it('produces and consumes events through Knot API', async () => {
    const adapter = new KafkaAdapter({ brokers: ['localhost:9092'] })

    const openProducers: MessageBrokerProducer[] = []
    let consumerHandle: MessageBrokerConsumer | undefined

    const originalProducer = adapter.producer.bind(adapter)
    const originalConsumer = adapter.consumer.bind(adapter)
      ; (adapter as any).producer = () => {
        const p = originalProducer()
        openProducers.push(p)
        return p
      }
      ; (adapter as any).consumer = (config: { groupId: string }) => {
        consumerHandle = originalConsumer(config)
        return consumerHandle!
      }

    const knot = new Knot({ adapter })

    const { produce } = knot.producer()

    await produce({ event: new UserCreated({ id: 'bootstrap', name: 'bootstrap' }) })

    const { consume, start } = knot.consumer(`group-${Date.now()}`)

    const receivedPromise = new Promise<UserCreated>((resolve) => {
      consume([UserCreated], async (event) => {
        if ((event as UserCreated).payload.id === 'bootstrap') return
        resolve(event as UserCreated)
      })
    })

    await start({ fromBeginning: true })

    const realEvent = new UserCreated({ id: '42', name: 'Ada' })
    await produce({ event: realEvent })

    const received = await receivedPromise
    expect(received.payload).toEqual(realEvent.payload)

    if (consumerHandle) {
      await consumerHandle.disconnect()
    }
    await Promise.all(
      openProducers.map((p) => (p.disconnect ? p.disconnect() : Promise.resolve()))
    )
  })
})


