import { createProducer } from '../producer'
import { TestEvent } from '../__mocks__/TestEvent'
import Event from '../event'

describe('Producer', () => {
  const connect = jest.fn()
  const send = jest.fn()
  const producerMock = { connect, send }
  const adapterMock = { producer: jest.fn(() => producerMock) }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('produces a single event', async () => {
    const { produce } = createProducer(adapterMock as any)
    const event = new TestEvent({ foo: 'bar', testId: 1 })

    await produce({ event })

    expect(connect).toHaveBeenCalled()
    expect(send).toHaveBeenCalledWith({
      topic: 'Test',
      messages: [
        {
          key: '1',
          value: expect.any(Buffer),
        },
      ],
    })

    const body = JSON.parse(
      (send.mock.calls[0][0].messages[0].value as Buffer).toString()
    )
    expect(body.payload).toEqual(event.payload)
    expect(body.metadata.event).toBe('TestEvent')
    expect(typeof body.metadata.producedAt).toBe('string')
  })

  it('produces multiple events', async () => {
    const { produce } = createProducer(adapterMock as any)
    const event1 = new TestEvent({ foo: 'bar', testId: 1 })
    const event2 = new TestEvent({ foo: 'baz', testId: 2 })

    await produce({ events: [event1, event2] })

    expect(send).toHaveBeenCalledWith({
      topic: 'Test',
      messages: expect.arrayContaining([
        expect.objectContaining({ key: '1' }),
        expect.objectContaining({ key: '2' }),
      ]),
    })
  })

  it('skips when disabled via env var', async () => {
    const { produce } = createProducer(adapterMock as any, { disableProducer: true })
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation()

    await produce({ event: new TestEvent({ foo: 'bar', testId: 1 }) })

    expect(connect).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
    expect(debugSpy).toHaveBeenCalledWith('Producing is disabled')

    debugSpy.mockRestore()
  })

  it('groups events by topic', async () => {
    class AnotherTestEvent extends Event<{ foo: string; testId: number }> {
      static aggregateRoot = 'AnotherTest'
      static routingKey = 'testId'
    }

    const { produce } = createProducer(adapterMock as any)
    await produce({
      events: [
        new TestEvent({ foo: 'bar', testId: 1 }),
        new AnotherTestEvent({ foo: 'baz', testId: 2 }),
      ],
    })

    expect(send).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenCalledWith({
      topic: 'Test',
      messages: expect.any(Array),
    })
    expect(send).toHaveBeenCalledWith({
      topic: 'AnotherTest',
      messages: expect.any(Array),
    })
  })
}) 