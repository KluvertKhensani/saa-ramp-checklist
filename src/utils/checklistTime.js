export function timeToSeconds(value) {
  if (!value) {
    return null;
  }

  const parts = value.split(":").map(Number);

  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;

  return hours * 3600 + minutes * 60 + seconds;
}

export function secondsToTime(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = ((value % 86400) + 86400) % 86400;

  const hours = Math.floor(normalized / 3600);
  const minutes = Math.floor((normalized % 3600) / 60);
  const seconds = normalized % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0"),
  ].join(":");
}

export function normalizeDatabaseTime(value) {
  if (!value) {
    return "";
  }

  return String(value).substring(0, 8);
}

export function calculateDelaySeconds(actualTime, plannedTime) {
  const actual = timeToSeconds(actualTime);
  const planned = timeToSeconds(plannedTime);

  if (actual === null || planned === null) {
    return null;
  }

  let delay = actual - planned;

  if (delay < -43200) {
    delay += 86400;
  }

  if (delay > 43200) {
    delay -= 86400;
  }

  return delay;
}

export function classifyDelay(delaySeconds) {
  if (delaySeconds === null) {
    return "pending";
  }

  if (delaySeconds <= 0) {
    return "ontime";
  }

  if (delaySeconds <= 300) {
    return "light";
  }

  return "delay";
}

export function formatDelay(delaySeconds) {
  if (delaySeconds === null) {
    return "Pending";
  }

  const sign = delaySeconds < 0 ? "-" : "+";
  const absolute = Math.abs(delaySeconds);
  const minutes = Math.floor(absolute / 60);
  const seconds = absolute % 60;

  return `${sign}${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export function currentTime() {
  const now = new Date();

  return [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join(":");
}