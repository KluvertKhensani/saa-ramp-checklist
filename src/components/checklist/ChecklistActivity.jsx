import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";

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
  onStart,
  onMark,
  observationDisabled = false,
  completeDisabled = false,
  canUndo = false,
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(false);

const isCompleted =
  row.status !== "pending";

const isStarted =
  Boolean(
    row.startedAt
  ) &&
  !isCompleted;

const markButtonDisabled =
  isCompleted
    ? !canUndo
    : completeDisabled;

const markButtonLabel =
  isCompleted
    ? canUndo
      ? "Undo"
      : "Completed"
    : isStarted
      ? "Complete"
      : "Start";

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
    : isStarted
      ? "started"
      : row.status;

const statusLabel =
  isOverdue
    ? "Overdue"
    : isStarted
      ? "Started"
      : STATUS_LABELS[
          row.status
        ] || "Pending";

  const allocationLabel =
  isCompleted
    ? statusLabel
    : isStarted
      ? timingLabel ||
        "Task in progress"
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
    expanded
      ? "pts-task-row-expanded"
      : "pts-task-row-collapsed",
    isOverdue
      ? "pts-task-row-overdue"
      : "",
    isStarted
      ? "pts-task-row-started"
      : "",
    isCompleted
      ? `pts-task-row-${row.status}`
      : "",
    observationDisabled &&
    completeDisabled
      ? "pts-task-row-readonly"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  function handleObservationChange(
  event
) {
  if (
    observationDisabled
  ) {
    return;
  }

  onObservationChange?.(
    event.target.value
  );
}

  function handleMark() {
  if (
    isCompleted &&
    !canUndo
  ) {
    return;
  }

  if (
    !isCompleted &&
    completeDisabled
  ) {
    return;
  }

  if (
    !isCompleted &&
    !isStarted
  ) {
    onStart?.();
    return;
  }

  onMark?.();
}

  function toggleExpanded() {
    setExpanded(
      (currentValue) =>
        !currentValue
    );
  }

  return (
    <article
      id={`checklist-task-${item.itemNumber}`}
      className={rowClassName}
      aria-readonly={observationDisabled && completeDisabled}
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

      <div className="pts-task-time pts-task-planned">
        <span>
          Planned
        </span>

        <strong>
          {plannedDisplay}
        </strong>
      </div>

      <div className="pts-task-time pts-task-actual">
        <span>
          Actual
        </span>

        <strong>
          {actualDisplay}
        </strong>
      </div>

      <div className="pts-task-delay">
        <span className="pts-mobile-label">
          Delay
        </span>

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
          disabled={markButtonDisabled}
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
) : isStarted ? (
  <Check
    size={17}
    aria-hidden="true"
  />
) : (
  <Clock3
    size={17}
    aria-hidden="true"
  />
)}

          {markButtonLabel}
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
    disabled={
      observationDisabled
    }
    aria-label={
      `Observation for ${item.activity}`
    }
  />
</div>

      <button
        type="button"
        className="pts-task-expand-button"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls={
          `task-detail-${item.itemNumber}`
        }
      >
        <span>
          {expanded
            ? "Hide details"
            : "View details"}
        </span>

        {expanded ? (
          <ChevronUp
            size={18}
            aria-hidden="true"
          />
        ) : (
          <ChevronDown
            size={18}
            aria-hidden="true"
          />
        )}
      </button>

      <div
        id={`task-detail-${item.itemNumber}`}
        className="pts-mobile-details"
      >
        <div>
          <span>
            Reference
          </span>

          <strong>
            {formatTaskReference(
              item
            )}
          </strong>
        </div>

        <div>
          <span>
            Planned
          </span>

          <strong>
            {plannedDisplay}
          </strong>
        </div>

        <div>
          <span>
            Actual
          </span>

          <strong>
            {actualDisplay}
          </strong>
        </div>

        <div>
          <span>
            Delay
          </span>

          <strong>
            {isCompleted
              ? formatDelay(
                  row.delaySeconds
                )
              : "--"}
          </strong>
        </div>

        <div className="pts-mobile-action">
          <span>
            Action
          </span>

          <button
            type="button"
            className={
              isCompleted
                ? "pts-done-button completed"
                : "pts-done-button"
            }
            onClick={handleMark}
            disabled={markButtonDisabled}
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

            {markButtonLabel}
          </button>
        </div>

        <label className="pts-mobile-comment">
          <span>
            Comment
          </span>

          <input
            type="text"
            value={
              row.observation || ""
            }
            onChange={
              handleObservationChange
            }
            placeholder="Observation"
            disabled={observationDisabled}
          />
        </label>
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