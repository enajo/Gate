type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown>;

const isDevelopment = process.env.NODE_ENV === "development";

function formatMessage(level: LogLevel, message: string, meta?: LogMeta) {
  const timestamp = new Date().toISOString();

  return {
    timestamp,
    level,
    message,
    ...(meta ? { meta } : {}),
  };
}

function write(level: LogLevel, message: string, meta?: LogMeta) {
  const payload = formatMessage(level, message, meta);

  switch (level) {
    case "debug":
      if (isDevelopment) {
        console.debug(payload);
      }
      break;
    case "info":
      console.info(payload);
      break;
    case "warn":
      console.warn(payload);
      break;
    case "error":
      console.error(payload);
      break;
  }
}

export const logger = {
  debug(message: string, meta?: LogMeta) {
    write("debug", message, meta);
  },

  info(message: string, meta?: LogMeta) {
    write("info", message, meta);
  },

  warn(message: string, meta?: LogMeta) {
    write("warn", message, meta);
  },

  error(message: string, meta?: LogMeta) {
    write("error", message, meta);
  },
};