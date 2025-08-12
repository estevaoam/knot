export interface Logger {
  info: (...args: any[]) => void
  warn: (...args: any[]) => void
  error: (...args: any[]) => void
  debug: (...args: any[]) => void
}

export class ConsoleLogger implements Logger {
  info(...args: any[]): void {
    console.info(...args)
  }

  warn(...args: any[]): void {
    console.warn(...args)
  }

  error(...args: any[]): void {
    console.error(...args)
  }

  debug(...args: any[]): void {
    console.debug(...args)
  }
}

export const defaultLogger: Logger = new ConsoleLogger()
