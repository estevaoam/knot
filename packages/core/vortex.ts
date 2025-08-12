import type { MessageBrokerAdapter } from './message-broker'
import { useProducer as useProducerFunction } from './producer'
import { useConsumer as useConsumerFunction } from './consumer'
import type { Logger } from './logger'
import { defaultLogger } from './logger'

export interface VortexOptions {
  adapter: MessageBrokerAdapter
  disableProducer?: boolean
  consumerGroupNamespace?: string
  logger?: Logger
}

export class Vortex {
  private disableProducer?: boolean
  private consumerGroupNamespace?: string
  private adapter: MessageBrokerAdapter
  private logger: Logger

  constructor({ adapter, disableProducer, consumerGroupNamespace, logger = defaultLogger }: VortexOptions) {
    this.adapter = adapter
    this.disableProducer = disableProducer
    this.consumerGroupNamespace = consumerGroupNamespace
    this.logger = logger
  }

  useProducer() {
    return useProducerFunction(this.adapter, { disableProducer: this.disableProducer, logger: this.logger })
  }

  useConsumer(groupId: string) {
    return useConsumerFunction(this.adapter, groupId, { consumerGroupNamespace: this.consumerGroupNamespace, logger: this.logger })
  }
}