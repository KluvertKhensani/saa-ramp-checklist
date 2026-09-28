const SECONDS_PER_DAY = 86400;
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_DAY =
  SECONDS_PER_DAY *
  MILLISECONDS_PER_SECOND;

export function timeToSeconds(value) {
  if (!value) {
    return null;
  }

  const parts = String(value)
    .split(":")
    .map(Number);

  const hours =
    parts[0] || 0;

  const minutes =
    parts[1] || 0;

  const seconds =
    parts[2] || 0;

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
    ((value % SECONDS_PER_DAY) +
      SECONDS_PER_DAY) %
    SECONDS_PER_DAY;

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

export function combineDateAndTime(
  dateValue,
  timeValue
) {
  if (!dateValue || !timeValue) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = String(dateValue)
    .split("-")
    .map(Number);

  const [
    hours = 0,
    minutes = 0,
    seconds = 0,
  ] = String(timeValue)
    .split(":")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  const dateTime =
    new Date(
      year,
      month - 1,
      day,
      hours,
      minutes,
      seconds,
      0
    );

  if (
    Number.isNaN(
      dateTime.getTime()
    )
  ) {
    return null;
  }

  return dateTime;
}

export function addSecondsToDateTime(
  dateTime,
  seconds
) {
  if (
    !(dateTime instanceof Date) ||
    Number.isNaN(
      dateTime.getTime()
    )
  ) {
    return null;
  }

  return new Date(
    dateTime.getTime() +
    seconds *
    MILLISECONDS_PER_SECOND
  );
}

export function alignDateTimeToReference(
  dateTime,
  referenceDateTime
) {
  if (
    !(dateTime instanceof Date) ||
    Number.isNaN(
      dateTime.getTime()
    )
  ) {
    return null;
  }

  if (
    !(
      referenceDateTime instanceof
      Date
    ) ||
    Number.isNaN(
      referenceDateTime.getTime()
    )
  ) {
    return dateTime;
  }

  let alignedDateTime =
    new Date(
      dateTime.getTime()
    );

  const halfDayMilliseconds =
    MILLISECONDS_PER_DAY / 2;

  const difference =
    alignedDateTime.getTime() -
    referenceDateTime.getTime();

  if (
    difference <
    -halfDayMilliseconds
  ) {
    alignedDateTime =
      new Date(
        alignedDateTime.getTime() +
        MILLISECONDS_PER_DAY
      );
  } else if (
    difference >
    halfDayMilliseconds
  ) {
    alignedDateTime =
      new Date(
        alignedDateTime.getTime() -
        MILLISECONDS_PER_DAY
      );
  }

  return alignedDateTime;
}

export function formatDateTimeAsTime(
  dateTime
) {
  if (
    !(dateTime instanceof Date) ||
    Number.isNaN(
      dateTime.getTime()
    )
  ) {
    return "";
  }

  return [
    String(
      dateTime.getHours()
    ).padStart(2, "0"),
    String(
      dateTime.getMinutes()
    ).padStart(2, "0"),
  ].join(":");
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

  let delay =
    actual - planned;

  if (delay < -43200) {
    delay += SECONDS_PER_DAY;
  }

  if (delay > 43200) {
    delay -= SECONDS_PER_DAY;
  }

  return delay;
}

export function calculateDateTimeDelaySeconds(
  actualDateTime,
  plannedDateTime
) {
  if (
    !(
      actualDateTime instanceof Date
    ) ||
    !(
      plannedDateTime instanceof Date
    ) ||
    Number.isNaN(
      actualDateTime.getTime()
    ) ||
    Number.isNaN(
      plannedDateTime.getTime()
    )
  ) {
    return null;
  }

  return Math.round(
    (
      actualDateTime.getTime() -
      plannedDateTime.getTime()
    ) /
    MILLISECONDS_PER_SECOND
  );
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
    delaySeconds < 0
      ? "-"
      : "+";

  const absolute =
    Math.abs(delaySeconds);

  const minutes =
    Math.floor(
      absolute / 60
    );

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
  const now =
    new Date();

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
    timeToSeconds(
      targetTime
    );

  if (targetSeconds === null) {
    return null;
  }

  const currentSeconds =
    currentDate.getHours() *
    3600 +
    currentDate.getMinutes() *
    60 +
    currentDate.getSeconds();

  let difference =
    targetSeconds -
    currentSeconds;

  if (difference < -43200) {
    difference += SECONDS_PER_DAY;
  }

  if (difference > 43200) {
    difference -= SECONDS_PER_DAY;
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
    Math.floor(
      absolute % 60
    );

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

function createEmptyPendingTiming(
  awaitingLabel
) {
  return {
    overdue: false,
    overdueSeconds: null,
    remainingSeconds: null,
    progressPercent: 0,
    label:
      awaitingLabel ||
      "Awaiting required time",
  };
}

export function getPendingTaskTiming(
  plannedValue,
  currentDate = new Date(),
  awaitingLabel =
    "Awaiting required time"
) {
  if (
    plannedValue instanceof Date
  ) {
    if (
      Number.isNaN(
        plannedValue.getTime()
      )
    ) {
      return createEmptyPendingTiming(
        awaitingLabel
      );
    }

    const difference =
      Math.round(
        (
          plannedValue.getTime() -
          currentDate.getTime()
        ) /
        MILLISECONDS_PER_SECOND
      );

    if (difference < 0) {
      const overdueSeconds =
        Math.abs(difference);

      const overdueMinutes =
        Math.max(
          1,
          Math.floor(
            overdueSeconds / 60
          )
        );

      return {
        overdue: true,
        overdueSeconds,
        remainingSeconds: 0,
        progressPercent: 100,
        label:
          `Overdue by ${overdueMinutes} min`,
      };
    }

    const remainingMinutes =
      Math.max(
        1,
        Math.ceil(
          difference / 60
        )
      );

    if (difference <= 30) {
      return {
        overdue: false,
        overdueSeconds: 0,
        remainingSeconds:
          difference,
        progressPercent: 98,
        label: "Due now",
      };
    }

    return {
      overdue: false,
      overdueSeconds: 0,
      remainingSeconds:
        difference,
      progressPercent: 0,
      label:
        `${remainingMinutes} min left`,
    };
  }

  const plannedSeconds =
    timeToSeconds(
      plannedValue
    );

  if (plannedSeconds === null) {
    return createEmptyPendingTiming(
      awaitingLabel
    );
  }

  const currentSeconds =
    currentDate.getHours() *
    3600 +
    currentDate.getMinutes() *
    60 +
    currentDate.getSeconds();

  let difference =
    plannedSeconds -
    currentSeconds;

  if (difference < -43200) {
    difference += SECONDS_PER_DAY;
  }

  if (difference > 43200) {
    difference -= SECONDS_PER_DAY;
  }

  if (difference < 0) {
    const overdueSeconds =
      Math.abs(difference);

    const overdueMinutes =
      Math.max(
        1,
        Math.floor(
          overdueSeconds / 60
        )
      );

    return {
      overdue: true,
      overdueSeconds,
      remainingSeconds: 0,
      progressPercent: 100,
      label:
        `Overdue by ${overdueMinutes} min`,
    };
  }

  const remainingMinutes =
    Math.max(
      1,
      Math.ceil(
        difference / 60
      )
    );

  if (difference <= 30) {
    return {
      overdue: false,
      overdueSeconds: 0,
      remainingSeconds:
        difference,
      progressPercent: 98,
      label: "Due now",
    };
  }

  return {
    overdue: false,
    overdueSeconds: 0,
    remainingSeconds:
      difference,
    progressPercent: 0,
    label:
      `${remainingMinutes} min left`,
  };
}