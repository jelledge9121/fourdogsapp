type LogLevel = "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  route: string;
  action: string;
  userId?: string;
  ip?: string;
  meta?: Record<string, unknown>;
  ts: string;
}

function emit(entry: LogEntry) {
  const line = JSON.stringify(entry);
  if (entry.level === "error") {
    console.error(line);
  } else if (entry.level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function apiLog(
  level: LogLevel,
  route: string,
  action: string,
  extra?: { userId?: string; ip?: string; meta?: Record<string, unknown> }
) {
  emit({
    level,
    route,
    action,
    userId: extra?.userId,
    ip: extra?.ip,
    meta: extra?.meta,
    ts: new Date().toISOString(),
  });
}
