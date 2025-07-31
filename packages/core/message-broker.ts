export type Message = {
  key: string
  value: Buffer
}

export interface MessageBrokerProducer {
  connect(): Promise<void>
  send(params: { topic: string; messages: Message[] }): Promise<void>
  disconnect?(): Promise<void>
}

export interface MessageBrokerConsumer {
  connect(): Promise<void>
  subscribe(params: { topics: string[]; fromBeginning: boolean }): Promise<void>
  run(params: {
    eachMessage: (args: {
      topic: string
      partition: number
      message: {
        value: Buffer
        offset: string
      }
    }) => Promise<void>
  }): Promise<void>
  on(event: string, handler: (...args: any[]) => void): void
  disconnect(): Promise<void>
}

export interface MessageBrokerAdapter {
  producer(): MessageBrokerProducer
  consumer(config: { groupId: string }): MessageBrokerConsumer
} 