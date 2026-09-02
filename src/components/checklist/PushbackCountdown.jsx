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
  std
) {
  const chocksSeconds =
    timeToSeconds(chocksOn);

  const stdSeconds =
    timeToSeconds(std);

  if (
    chocksSeconds === null ||
    stdSeconds === null
  ) {
    return "Not configured";
  }

  let difference =
    stdSeconds - chocksSeconds;

  if (difference < 0) {
    difference += 86400;
  }

  const minutes =
    Math.round(
      difference / 60
    );

  return `${minutes} min turnaround window`;
}

function getCountdownState(
  remainingSeconds
) {
  if (remainingSeconds === null) {
    return {
      key: "not-configured",
      label: "Not configured",
    };
  }

  if (remainingSeconds <= 0) {
    return {
      key: "past-target",
      label: "Pushback due",
    };
  }

  if (remainingSeconds <= 300) {
    return {
      key: "critical",
      label: "Critical",
    };
  }

  if (remainingSeconds <= 900) {
    return {
      key: "attention",
      label: "Attention required",
    };
  }

  return {
    key: "on-target",
    label: "On target",
  };
}

export default function PushbackCountdown({
  chocksOn,
  std,
  disabled = false,
}) {
  const [
    startedConfiguration,
    setStartedConfiguration,
  ] = useState("");

  const [
    currentDate,
    setCurrentDate,
  ] = useState(() => new Date());

  const configured =
    Boolean(chocksOn && std);

  const configurationKey =
    configured
      ? `${chocksOn}-${std}`
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
        setCurrentDate(new Date());
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
        std,
        currentDate
      );
    }, [
      configured,
      currentDate,
      std,
    ]);

  const countdownState =
    getCountdownState(
      remainingSeconds
    );

  const progress = useMemo(() => {
    const chocksSeconds =
      timeToSeconds(chocksOn);

    const targetSeconds =
      timeToSeconds(std);

    if (
      chocksSeconds === null ||
      targetSeconds === null
    ) {
      return 0;
    }

    let totalDuration =
      targetSeconds -
      chocksSeconds;

    if (totalDuration <= 0) {
      totalDuration += 86400;
    }

    if (
      remainingSeconds === null
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
        (elapsed / totalDuration) *
          100
      )
    );
  }, [
    chocksOn,
    remainingSeconds,
    std,
  ]);

  function startCountdown() {
    if (
      !configured ||
      disabled
    ) {
      return;
    }

    setCurrentDate(new Date());

    setStartedConfiguration(
      configurationKey
    );
  }

  function resetCountdown() {
    setStartedConfiguration("");
    setCurrentDate(new Date());
  }

  const countdownLabel =
    remainingSeconds !== null &&
    remainingSeconds >= 0
      ? "Time to pushback"
      : "Past pushback target";

  return (
    <section
      className={
        `pushback-panel pushback-${countdownState.key}`
      }
    >
      <div className="pushback-heading">
        <div>
          <p className="ramp-eyebrow">
            Operational target
          </p>

          <h2>
            Pushback countdown
          </h2>

          <p>
            Countdown to the defined
            STD pushback target.
          </p>
        </div>

        <Clock3
          size={28}
          aria-hidden="true"
        />
      </div>

      {!configured ? (
        <div className="pushback-notice">
          Enter Chocks On and STD to
          configure the operational
          pushback target.
        </div>
      ) : (
        <>
          <div className="pushback-summary">
            <div>
              <span>
                Chocks On
              </span>

              <strong>
                {chocksOn}
              </strong>
            </div>

            <div>
              <span>
                Target STD
              </span>

              <strong>
                {std}
              </strong>
            </div>

            <div>
              <span>
                Allocated window
              </span>

              <strong>
                {formatTurnaroundWindow(
                  chocksOn,
                  std
                )}
              </strong>
            </div>
          </div>

          {!started ? (
            <button
              type="button"
              className={
                "ramp-button ramp-button-green pushback-start"
              }
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
                aria-label={
                  "Turnaround progress toward pushback"
                }
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={
                  Math.round(progress)
                }
              >
                <span
                  style={{
                    width: `${progress}%`,
                  }}
                />
              </div>

              <button
                type="button"
                className={
                  "ramp-button ramp-button-light pushback-reset"
                }
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