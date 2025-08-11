export type LogLevel = "silent" | "error" | "warn" | "info" | "debug";

export class Logger {
  private levelPriority: Record<Exclude<LogLevel, "silent">, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  private current: LogLevel;

  constructor(level: LogLevel = "info") {
    this.current = level;
  }

  setLevel(level: LogLevel): void {
    this.current = level;
  }

  private shouldLog(target: Exclude<LogLevel, "silent">): boolean {
    if (this.current === "silent") return false;
    return (
      this.levelPriority[target] <= this.levelPriority[this.current as Exclude<LogLevel, "silent">]
    );
  }

  error(message?: unknown, ...optional: unknown[]): void {
    if (!this.shouldLog("error")) return;
     
    console.error(message, ...optional);
  }
  warn(message?: unknown, ...optional: unknown[]): void {
    if (!this.shouldLog("warn")) return;
     
    console.warn(message, ...optional);
  }
  info(message?: unknown, ...optional: unknown[]): void {
    if (!this.shouldLog("info")) return;
    // eslint-disable-next-line no-console
    console.info(message, ...optional);
  }
  debug(message?: unknown, ...optional: unknown[]): void {
    if (!this.shouldLog("debug")) return;
    // eslint-disable-next-line no-console
    console.debug(message, ...optional);
  }
}
