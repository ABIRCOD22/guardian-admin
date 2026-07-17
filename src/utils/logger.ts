const LOG_PREFIX = "[Guardian]";

type LogLevel = "debug" | "info" | "warn" | "error";

class AppLogger {
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.NODE_ENV !== "production" || true;
  }

  private log(level: LogLevel, module: string, message: string, data?: any) {
    if (!this.enabled) return;
    const prefix = `${LOG_PREFIX}[${module}]`;
    const timestamp = new Date().toISOString();
    const full = `${timestamp} ${prefix} ${message}`;
    const consoleFn = level === "error" ? console.error : level === "warn" ? console.warn : level === "info" ? console.info : console.debug;
    if (data !== undefined) {
      consoleFn(full, data);
    } else {
      consoleFn(full);
    }
  }

  debug(module: string, message: string, data?: any) { this.log("debug", module, message, data); }
  info(module: string, message: string, data?: any) { this.log("info", module, message, data); }
  warn(module: string, message: string, data?: any) { this.log("warn", module, message, data); }
  error(module: string, message: string, data?: any, error?: Error) {
    this.log("error", module, message, data);
    if (error?.stack) console.error(`${LOG_PREFIX}[${module}] Stack:`, error.stack);
  }
}

export const logger = new AppLogger();
