import {
  CircleCheck,
  Clock3,
  Play,
  RotateCcw,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  formatCountdown,
  signedTimeDifference,
  timeToSeconds,
} from "../../utils/checklistTime";

function formatTurnaroundWindow(
  chocksOn,
  definedPushTime
) {
  const chocksSeconds =
    timeToSeconds(
      chocksOn
    );

  const pushSeconds =
    timeToSeconds(
      definedPushTime
    );

  if (
    chocksSeconds === null ||
    pushSeconds === null
  ) {
    return "Not configured";
  }

  let difference =
    pushSeconds -
    chocksSeconds;

  if (difference < 0) {
    difference += 86400;
  }

  const minutes =
    Math.round(
      difference / 60
    );

  return (
    `${minutes} min ` +
    "turnaround window"
  );
}

function getCountdownState(
  remainingSeconds
) {
  if (
    remainingSeconds === null
  ) {
    return {
      key: "not-configured",
      label:
        "Not configured",
    };
  }

  if (
    remainingSeconds <= 0
  ) {
    return {
      key: "past-target",
      label:
        "Defined push due",
    };
  }

  if (
    remainingSeconds <= 300
  ) {
    return {
      key: "critical",
      label: "Critical",
    };
  }

  if (
    remainingSeconds <= 900
  ) {
    return {
      key: "attention",
      label:
        "Attention required",
    };
  }

  return {
    key: "on-target",
    label: "On target",
  };
}

export default function PushbackCountdown({
  chocksOn,
  definedPushTime,
  disabled = false,
}) {
  const [
    startedConfiguration,
    setStartedConfiguration,
  ] = useState("");

  const [
    currentDate,
    setCurrentDate,
  ] = useState(
    () => new Date()
  );

  const configured =
    Boolean(
      chocksOn &&
      definedPushTime
    );

  const configurationKey =
    configured
      ? `${chocksOn}-${definedPushTime}`
      : "";

  const started =
    configured &&
    startedConfiguration ===
      configurationKey;

  useEffect(() => {
    if (!started) {
      return undefined;
    }

    const intervalId =
      window.setInterval(() => {
        setCurrentDate(
          new Date()
        );
      }, 1000);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, [started]);

  const remainingSeconds =
    useMemo(() => {
      if (!configured) {
        return null;
      }

      return signedTimeDifference(
        definedPushTime,
        currentDate
      );
    }, [
      configured,
      currentDate,
      definedPushTime,
    ]);

  const countdownState =
    getCountdownState(
      remainingSeconds
    );

  const progress =
    useMemo(() => {
      const chocksSeconds =
        timeToSeconds(
          chocksOn
        );

      const targetSeconds =
        timeToSeconds(
          definedPushTime
        );

      if (
        chocksSeconds === null ||
        targetSeconds === null
      ) {
        return 0;
      }

      let totalDuration =
        targetSeconds -
        chocksSeconds;

      if (
        totalDuration <= 0
      ) {
        totalDuration +=
          86400;
      }

      if (
        remainingSeconds ===
        null
      ) {
        return 0;
      }

      const elapsed =
        totalDuration -
        remainingSeconds;

      return Math.min(
        100,
        Math.max(
          0,
          elapsed /
            totalDuration *
            100
        )
      );
    }, [
      chocksOn,
      definedPushTime,
      remainingSeconds,
    ]);

  function startCountdown() {
    if (
      !configured ||
      disabled
    ) {
      return;
    }

    setCurrentDate(
      new Date()
    );

    setStartedConfiguration(
      configurationKey
    );
  }

  function resetCountdown() {
    setStartedConfiguration(
      ""
    );

    setCurrentDate(
      new Date()
    );
  }

  const countdownLabel =
    remainingSeconds !== null &&
    remainingSeconds >= 0
      ? "Time to defined push"
      : "Past defined push target";

  return (
    <section
      className={
        `pushback-panel ` +
        `pushback-${countdownState.key}`
      }
    >
      <div className="pushback-heading">
        <div>
          <p className="ramp-eyebrow">
            Operational target
          </p>

          <h2>
            Defined push countdown
          </h2>

          <p>
            Countdown to the defined
            operational push time.
          </p>
        </div>

        <Clock3
          size={28}
          aria-hidden="true"
        />
      </div>

      {!configured ? (
        <div className="pushback-notice">
          Record Chocks On Real and
          select Defined Push Time to
          configure the countdown.
        </div>
      ) : (
        <>
          <div className="pushback-summary">
            <div>
              <span>
                Chocks On Real
              </span>

              <strong>
                {chocksOn}
              </strong>
            </div>

            <div>
              <span>
                Defined Push Time
              </span>

              <strong>
                {definedPushTime}
              </strong>
            </div>

            <div>
              <span>
                Allocated window
              </span>

              <strong>
                {formatTurnaroundWindow(
                  chocksOn,
                  definedPushTime
                )}
              </strong>
            </div>
          </div>

          {!started ? (
            <button
              type="button"
              className="ramp-button ramp-button-green pushback-start"
              onClick={
                startCountdown
              }
              disabled={disabled}
            >
              <Play
                size={18}
                aria-hidden="true"
              />

              Ready to Start
            </button>
          ) : (
            <>
              <div className="pushback-clock">
                <span>
                  {countdownLabel}
                </span>

                <strong>
                  {formatCountdown(
                    remainingSeconds
                  )}
                </strong>

                <div className="pushback-state">
                  <CircleCheck
                    size={17}
                    aria-hidden="true"
                  />

                  {countdownState.label}
                </div>
              </div>

              <div
                className="pushback-progress"
                role="progressbar"
                aria-label="Turnaround progress toward defined push"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={
                  Math.round(
                    progress
                  )
                }
              >
                <span
                  style={{
                    width:
                      `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className="ramp-button ramp-button-light pushback-reset"
                onClick={
                  resetCountdown
                }
                disabled={disabled}
              >
                <RotateCcw
                  size={17}
                  aria-hidden="true"
                />

                Reset Countdown
              </button>
            </>
          )}
        </>
      )}
    </section>
  );
}