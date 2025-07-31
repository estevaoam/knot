import type { MessageBrokerAdapter } from './message-broker'
import { useProducer as useProducerFunction } from './producer'
import { useConsumer as useConsumerFunction } from './consumer'

export interface VortexOptions {
  adapter: MessageBrokerAdapter
  disableProducer?: boolean
  consumerGroupNamespace?: string
}

export class Vortex {
  private disableProducer?: boolean
  private consumerGroupNamespace?: string
  private adapter: MessageBrokerAdapter

  constructor({ adapter, disableProducer, consumerGroupNamespace }: VortexOptions) {
    this.adapter = adapter
    this.disableProducer = disableProducer
    this.consumerGroupNamespace = consumerGroupNamespace
  }

  useProducer() {
    return useProducerFunction(this.adapter, { disableProducer: this.disableProducer })
  }

  useConsumer(groupId: string) {
    return useConsumerFunction(this.adapter, groupId, { consumerGroupNamespace: this.consumerGroupNamespace })
  }
}