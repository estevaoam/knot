import { Vortex, Event } from '../../core/index'
import { KafkaAdapter } from '../index'
import { MessageBrokerProducer, MessageBrokerConsumer } from '../../core/message-broker'

jest.setTimeout(30000)

class UserCreated extends Event<{ id: string; name: string }> {
  static aggregateRoot = 'UserInt'
  static routingKey = 'id'
}

describe('Vortex client integration (Kafka)', () => {
  it('produces and consumes events through Vortex API', async () => {
    const adapter = new KafkaAdapter({ brokers: ['localhost:9092'] })

    // Capture all producers/consumers created by Vortex so we can close them later
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

    const vortex = new Vortex({ adapter })

    const { produce } = vortex.producer()

    // Ensure topic exists
    await produce({ event: new UserCreated({ id: 'bootstrap', name: 'bootstrap' }) })

    const { consume, start } = vortex.consumer(`group-${Date.now()}`)

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

    // Teardown: disconnect consumer and producers
    if (consumerHandle) {
      await consumerHandle.disconnect()
    }
    await Promise.all(
      openProducers.map((p) => (p.disconnect ? p.disconnect() : Promise.resolve()))
    )
  })
})
