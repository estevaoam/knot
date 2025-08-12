import { KafkaAdapter } from '../index'

jest.setTimeout(30000)

describe('KafkaAdapter integration', () => {
  it('produces and consumes messages', async () => {
    const topic = `test-${Date.now()}`
    const adapter = new KafkaAdapter({ brokers: ['localhost:9092'] })

    const producer = adapter.producer()
    await producer.connect()

    // Ensure topic exists by sending a bootstrap message and immediately flushing
    await producer.send({
      topic,
      messages: [
        { key: 'bootstrap', value: Buffer.from('bootstrap') },
      ],
    })

    const consumer = adapter.consumer({ groupId: `group-${Date.now()}` })
    await consumer.connect()
    await consumer.subscribe({ topics: [topic], fromBeginning: true })

    const consumed = new Promise<any>((resolve) => {
      consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return
          const data = message.value.toString()
          if (data === 'bootstrap') return // skip bootstrap
          resolve(JSON.parse(data))
        },
      })
    })

    const payload = { foo: 'bar' }
    await producer.send({
      topic,
      messages: [
        {
          key: '1',
          value: Buffer.from(JSON.stringify(payload)),
        },
      ],
    })

    const received = await consumed
    expect(received).toEqual(payload)

    await consumer.disconnect()
    if (producer.disconnect) {
      await producer.disconnect()
    }
  })
})

