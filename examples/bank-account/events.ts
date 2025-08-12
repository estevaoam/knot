import { Event } from '../../packages/core/index'

export type DepositPayload = { accountId: string; amount: number }
export type WithdrawPayload = { accountId: string; amount: number }

export class Deposit extends Event<DepositPayload> {
  static aggregateRoot = 'BankAccount'
  static routingKey = 'accountId'
}

export class Withdraw extends Event<WithdrawPayload> {
  static aggregateRoot = 'BankAccount'
  static routingKey = 'accountId'
}
