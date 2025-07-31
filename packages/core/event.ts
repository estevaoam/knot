export abstract class Event<T = any> {
  public static readonly aggregateRoot: string
  public static readonly routingKey: string

  public readonly payload: T

  constructor(payload: T) {
    this.payload = payload
  }
}

export default Event
