import { createConsumer } from '../consumer'
import { TestEvent } from '../__mocks__/TestEvent'

describe('Consumer', () => {
  let eachMessage: any

  const connect = jest.fn()
  const subscribe = jest.fn()
  const run = jest.fn().mockImplementation(({ eachMessage: cb }) => {
    eachMessage = cb
    return Promise.resolve()
  })
  const on = jest.fn()
  const disconnect = jest.fn()

  const consumerMock = { connect, subscribe, run, on, disconnect }
  const adapterMock = { producer: jest.fn(), consumer: jest.fn(() => consumerMock) }

  beforeEach(() => {
    jest.clearAllMocks()
    // adapter passed directly to createConsumer calls
  })

  it('subscribes and starts consumer', async () => {
    const { consume, start } = createConsumer(adapterMock as any, 'group')
    await consume([TestEvent], () => { })
    await start()

    expect(connect).toHaveBeenCalled()
    expect(subscribe).toHaveBeenCalledWith({ topics: ['Test'], fromBeginning: false })
    expect(run).toHaveBeenCalledWith({ eachMessage: expect.any(Function) })
  })

  it('processes messages and calls handler', async () => {
    const handler = jest.fn()
    const { consume, start } = createConsumer(adapterMock as any, 'group')
    await consume([TestEvent], handler)
    await start()

    await eachMessage({
      topic: 'Test',
      partition: 0,
      message: {
        value: Buffer.from(
          JSON.stringify({ metadata: { event: 'TestEvent' }, payload: { foo: 'bar', testId: 1 } })
        ),
        offset: '0',
      },
    })

    expect(handler).toHaveBeenCalledWith(expect.any(TestEvent), 'Test', 0)
  })

  it('skips unknown events', async () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation()

    const { consume, start } = createConsumer(adapterMock as any, 'group')
    await consume([TestEvent], jest.fn())
    await start()

    await eachMessage({
      topic: 'Test',
      partition: 0,
      message: {
        value: Buffer.from(
          JSON.stringify({ metadata: { event: 'UnknownEvent' }, payload: {} })
        ),
        offset: '0',
      },
    })

    expect(debugSpy).toHaveBeenCalledWith('Skipping event UnknownEvent...')
    debugSpy.mockRestore()
  })

  it('handles errors thrown by handlers', async () => {
    jest.spyOn(console, 'error').mockImplementation()
    const failingHandler = jest.fn().mockRejectedValue(new Error('fail'))

    const { consume, start } = createConsumer(adapterMock as any, 'group')
    await consume([TestEvent], failingHandler)
    await start()

    await eachMessage({
      topic: 'Test',
      partition: 0,
      message: {
        value: Buffer.from(
          JSON.stringify({ metadata: { event: 'TestEvent' }, payload: {} })
        ),
        offset: '0',
      },
    })

    expect(console.error).toHaveBeenCalledWith('Error processing event')
  })

  it('disconnects on consumer.stop', async () => {
    const { start } = createConsumer(adapterMock as any, 'group')
    await start()

    const stopHandler = on.mock.calls.find(([event]) => event === 'consumer.stop')[1]
    await stopHandler()

    expect(disconnect).toHaveBeenCalled()
  })
}) 