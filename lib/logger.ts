type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const isProd = process.env.NODE_ENV === "production";

// ANSI colours — dev only
const COLOURS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info:  "\x1b[32m", // green
  warn:  "\x1b[33m", // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

// Error instances serialize to "{}" via JSON.stringify (message/stack/name
// aren't own-enumerable), so any Error passed as a context value would
// silently vanish from the log. Expand them into plain fields instead.
function serializeErrors(ctx: LogContext): LogContext {
  return Object.fromEntries(
    Object.entries(ctx).map(([key, value]) =>
      value instanceof Error
        ? [key, { name: value.name, message: value.message, stack: value.stack }]
        : [key, value],
    ),
  );
}

function write(
  level: LogLevel,
  message: string,
  ctx: LogContext,
  meta?: LogContext,
) {
  if (level === "debug" && isProd) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...serializeErrors(ctx),
    ...serializeErrors(meta ?? {}),
  };

  if (isProd) {
    // One JSON line per entry — works with any log aggregator (Datadog, Logtail…)
    const out = JSON.stringify(entry);
    level === "error" ? console.error(out) : console.log(out);
    return;
  }

  // Dev: coloured, human-readable
  const colour = COLOURS[level];
  const prefix = `${colour}[${level.toUpperCase()}]${RESET}`;
  const extra = { ...serializeErrors(ctx), ...serializeErrors(meta ?? {}) };
  const extraStr = Object.keys(extra).length ? " " + JSON.stringify(extra) : "";
  const fn =
    level === "error" ? console.error
    : level === "warn" ? console.warn
    : level === "debug" ? console.debug
    : console.log;
  fn(`${entry.ts} ${prefix} ${message}${extraStr}`);
}

function makeLogger(ctx: LogContext = {}) {
  return {
    debug(message: string, meta?: LogContext) {
      write("debug", message, ctx, meta);
    },
    info(message: string, meta?: LogContext) {
      write("info", message, ctx, meta);
    },
    warn(message: string, meta?: LogContext) {
      write("warn", message, ctx, meta);
    },
    error(message: string, meta?: LogContext) {
      write("error", message, ctx, meta);
    },
    /** New logger with extra fields bound to every log line (requestId, userId…). */
    child(extra: LogContext) {
      return makeLogger({ ...ctx, ...extra });
    },
  };
}

export const logger = makeLogger();
export type Logger = ReturnType<typeof makeLogger>;
