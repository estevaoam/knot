import Event from '../event'

export class TestEvent extends Event<{ foo: string; testId: number }> {
  static aggregateRoot = 'Test'
  static routingKey = 'testId'
} 