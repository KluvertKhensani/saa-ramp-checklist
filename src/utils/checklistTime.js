export function timeToSeconds(value) {
  if (!value) {
    return null;
  }

  const parts = String(value)
    .split(":")
    .map(Number);

  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const seconds = parts[2] || 0;

  return (
    hours * 3600 +
    minutes * 60 +
    seconds
  );
}

export function secondsToTime(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const normalized =
    ((value % 86400) + 86400) %
    86400;

  const hours =
    Math.floor(
      normalized / 3600
    );

  const minutes =
    Math.floor(
      (normalized % 3600) / 60
    );

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
  ].join(":");
}

export function normalizeDatabaseTime(value) {
  if (!value) {
    return "";
  }

  return String(value).substring(0, 5);
}

export function calculateDelaySeconds(
  actualTime,
  plannedTime
) {
  const actual =
    timeToSeconds(actualTime);

  const planned =
    timeToSeconds(plannedTime);

  if (
    actual === null ||
    planned === null
  ) {
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

export function classifyDelay(
  delaySeconds
) {
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

export function formatDelay(
  delaySeconds
) {
  if (delaySeconds === null) {
    return "Pending";
  }

  if (delaySeconds === 0) {
    return "On target";
  }

  const sign =
    delaySeconds < 0 ? "-" : "+";

  const absolute =
    Math.abs(delaySeconds);

  const minutes =
    Math.floor(absolute / 60);

  if (minutes === 0) {
    return delaySeconds < 0
      ? "Under 1 min early"
      : "Under 1 min late";
  }

  return `${sign}${minutes} min`;
}

export function formatDuration(
  durationSeconds
) {
  if (
    durationSeconds === null ||
    durationSeconds === undefined
  ) {
    return "Milestone target";
  }

  const minutes =
    Math.max(
      1,
      Math.round(
        durationSeconds / 60
      )
    );

  return `${minutes} min allocated`;
}

export function currentTime() {
  const now = new Date();

  return [
    String(
      now.getHours()
    ).padStart(2, "0"),
    String(
      now.getMinutes()
    ).padStart(2, "0"),
  ].join(":");
}

export function signedTimeDifference(
  targetTime,
  currentDate = new Date()
) {
  const targetSeconds =
    timeToSeconds(targetTime);

  if (targetSeconds === null) {
    return null;
  }

  const currentSeconds =
    currentDate.getHours() * 3600 +
    currentDate.getMinutes() * 60 +
    currentDate.getSeconds();

  let difference =
    targetSeconds - currentSeconds;

  if (difference < -43200) {
    difference += 86400;
  }

  if (difference > 43200) {
    difference -= 86400;
  }

  return difference;
}

export function formatCountdown(
  seconds
) {
  if (
    seconds === null ||
    seconds === undefined
  ) {
    return "--:--";
  }

  const absolute =
    Math.abs(seconds);

  const hours =
    Math.floor(
      absolute / 3600
    );

  const minutes =
    Math.floor(
      (absolute % 3600) / 60
    );

  const remainingSeconds =
    absolute % 60;

  if (hours > 0) {
    return [
      String(hours).padStart(2, "0"),
      String(minutes).padStart(2, "0"),
      String(
        remainingSeconds
      ).padStart(2, "0"),
    ].join(":");
  }

  return [
    String(minutes).padStart(2, "0"),
    String(
      remainingSeconds
    ).padStart(2, "0"),
  ].join(":");
}