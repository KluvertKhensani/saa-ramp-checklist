import {
  Check,
  Clock3,
  RotateCcw,
} from "lucide-react";

import {
  formatDelay,
} from "../../utils/checklistTime";

const STATUS_LABELS = {
  pending: "Pending",
  ontime: "On Time",
  light: "Slightly Delayed",
  delay: "Delayed",
};

function displayTime(value) {
  if (!value) {
    return "--";
  }

  return String(value).slice(
    0,
    5
  );
}

function formatTaskReference(
  item
) {
  if (
    item.offsetSec === null ||
    item.offsetSec === undefined
  ) {
    return "Milestone";
  }

  if (item.offsetSec === 0) {
    return "At Chocks On";
  }

  const absoluteMinutes =
    Math.abs(
      Math.round(
        item.offsetSec / 60
      )
    );

  if (item.offsetSec < 0) {
    return (
      `${absoluteMinutes} min ` +
      "before Chocks On"
    );
  }

  return (
    `${absoluteMinutes} min ` +
    "after Chocks On"
  );
}

function calculateProgress(
  item,
  remainingSeconds,
  overdue,
  completed
) {
  if (completed || overdue) {
    return 100;
  }

  if (
    remainingSeconds === null ||
    remainingSeconds === undefined
  ) {
    return 0;
  }

  const taskWindowSeconds =
    Math.max(
      Math.abs(
        item.offsetSec || 0
      ),
      60
    );

  const elapsedSeconds =
    Math.max(
      0,
      taskWindowSeconds -
        remainingSeconds
    );

  return Math.min(
    100,
    Math.max(
      0,
      Math.round(
        elapsedSeconds /
          taskWindowSeconds *
          100
      )
    )
  );
}

export default function ChecklistActivity({
  item,
  row,
  plannedTime,
  overdue = false,
  remainingSeconds = null,
  timingLabel = "",
  onObservationChange,
  onMark,
  disabled = false,
}) {
  const isCompleted =
    row.status !== "pending";

  const isOverdue =
    overdue &&
    !isCompleted;

  const plannedDisplay =
    displayTime(
      plannedTime
    );

  const actualDisplay =
    displayTime(
      row.actualTime
    );

  const statusKey =
    isOverdue
      ? "overdue"
      : row.status;

  const statusLabel =
    isOverdue
      ? "Overdue"
      : STATUS_LABELS[
          row.status
        ] || "Pending";

  const allocationLabel =
    isCompleted
      ? statusLabel
      : timingLabel ||
        "Awaiting Chocks On";

  const progressPercent =
    calculateProgress(
      item,
      remainingSeconds,
      isOverdue,
      isCompleted
    );

  const rowClassName = [
    "pts-task-row",
    isOverdue
      ? "pts-task-row-overdue"
      : "",
    isCompleted
      ? `pts-task-row-${row.status}`
      : "",
    disabled
      ? "pts-task-row-readonly"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  function handleObservationChange(
    event
  ) {
    if (disabled) {
      return;
    }

    onObservationChange?.(
      event.target.value
    );
  }

  function handleMark() {
    if (disabled) {
      return;
    }

    onMark?.();
  }

  return (
    <article
      id={`checklist-task-${item.itemNumber}`}
      className={rowClassName}
      aria-readonly={disabled}
    >
      <div className="pts-task-number">
        {item.itemNumber}
      </div>

      <div className="pts-task-phase">
        {item.phase}
      </div>

      <div className="pts-task-activity">
        <strong>
          {item.activity}
        </strong>
      </div>

      <div className="pts-task-reference">
        {formatTaskReference(
          item
        )}
      </div>

      <div className="pts-task-time">
        <span>
          Planned
        </span>

        <strong>
          {plannedDisplay}
        </strong>
      </div>

      <div className="pts-task-time">
        <span>
          Actual
        </span>

        <strong>
          {actualDisplay}
        </strong>
      </div>

      <div className="pts-task-delay">
        {isCompleted
          ? formatDelay(
              row.delaySeconds
            )
          : "--"}
      </div>

      <div className="pts-task-status">
        <span
          className={
            `activity-status ` +
            `status-${statusKey}`
          }
        >
          {statusLabel}
        </span>
      </div>

      <div className="pts-task-action">
        <button
          type="button"
          className={
            isCompleted
              ? "pts-done-button completed"
              : "pts-done-button"
          }
          onClick={handleMark}
          disabled={disabled}
          aria-label={
            isCompleted
              ? `Return ${item.activity} to pending`
              : `Complete ${item.activity}`
          }
        >
          {isCompleted ? (
            <RotateCcw
              size={17}
              aria-hidden="true"
            />
          ) : (
            <Check
              size={17}
              aria-hidden="true"
            />
          )}

          {isCompleted
            ? "Undo"
            : "Done"}
        </button>
      </div>

      <div className="pts-task-observation">
        <input
          type="text"
          value={
            row.observation || ""
          }
          onChange={
            handleObservationChange
          }
          placeholder="Observation"
          disabled={disabled}
          aria-label={
            `Observation for ${item.activity}`
          }
        />
      </div>

      <div className="pts-allocation-bar">
        <div className="pts-allocation-heading">
          <span>
            <Clock3
              size={13}
              aria-hidden="true"
            />

            Task allocation
          </span>

          <strong>
            {allocationLabel}
          </strong>
        </div>

        <div className="pts-allocation-track">
          <span
            className={
              isOverdue
                ? "overdue"
                : isCompleted
                  ? "completed"
                  : ""
            }
            style={{
              width:
                `${progressPercent}%`,
            }}
          />
        </div>
      </div>
    </article>
  );
}
