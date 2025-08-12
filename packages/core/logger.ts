export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface Logger {
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  debug: (...args: any[]) => void
  level?: LogLevel
  setLevel?: (level: LogLevel) => void
}

const levelOrder: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
}

export class ConsoleLogger implements Logger {
  private currentLevel: LogLevel

  constructor(level: LogLevel = 'info') {
    this.currentLevel = level
  }

  get level(): LogLevel {
    return this.currentLevel
  }

  setLevel(level: LogLevel) {
    this.currentLevel = level
  }

  private shouldLog(level: LogLevel): boolean {
    return levelOrder[level] <= levelOrder[this.currentLevel]
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) console.info(...args)
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) console.warn(...args)
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) console.error(...args)
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) console.debug(...args)
  }
}

export const defaultLogger: Logger = new ConsoleLogger()
