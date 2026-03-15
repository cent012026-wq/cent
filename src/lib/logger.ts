type Level = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function emit(level: Level, message: string, context?: LogContext): void {
  const payload = {
    level,
    message,
    context: context ?? {},
    timestamp: new Date().toISOString(),
  };

  const output = JSON.stringify(payload);

  switch (level) {
    case "warn":
      console.warn(output);
      break;
    case "error":
      console.error(output);
      break;
    default:
      console.log(output);
      break;
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => emit("debug", message, context),
  info: (message: string, context?: LogContext) => emit("info", message, context),
  warn: (message: string, context?: LogContext) => emit("warn", message, context),
  error: (message: string, context?: LogContext) => emit("error", message, context),
};
