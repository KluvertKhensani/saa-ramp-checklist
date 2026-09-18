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
  formatDuration,
} from "../../utils/checklistTime";

const STATUS_LABELS = {
  pending: "Pending",
  ontime: "On Time",
  light: "Slightly Delayed",
  delay: "Delayed",
};

function displayTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

export default function ChecklistActivity({
  item,
  row,
  plannedTime,
  overdue = false,
  overdueLabel = "",
  forceExpanded = false,
  onExpanded,
  onObservationChange,
  onMark,
  disabled = false,
}) {
  const [expanded, setExpanded] =
    useState(false);

  const isExpanded =
    forceExpanded || expanded;

  const isCompleted =
    row.status !== "pending";

  const isOverdue =
    overdue && !isCompleted;

  const plannedDisplay =
    displayTime(plannedTime);

  const actualDisplay =
    displayTime(row.actualTime);

  const visibleStatus =
    isOverdue
      ? "overdue"
      : row.status;

  const visibleStatusLabel =
    isOverdue
      ? "Overdue"
      : STATUS_LABELS[row.status] ||
        "Pending";

  const rowClassName = [
    "checklist-row",
    disabled
      ? "checklist-row-readonly"
      : "",
    isOverdue
      ? "checklist-row-overdue"
      : "",
    isExpanded
      ? "checklist-row-expanded"
      : "checklist-row-collapsed",
  ]
    .filter(Boolean)
    .join(" ");

  function toggleExpanded() {
    if (isExpanded) {
      setExpanded(false);
      onExpanded?.(null);
      return;
    }

    setExpanded(true);
    onExpanded?.(item.itemNumber);
  }

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
      <button
        type="button"
        className="checklist-row-toggle"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        aria-controls={
          `task-details-${item.itemNumber}`
        }
        aria-label={
          isExpanded
            ? `Collapse ${item.activity}`
            : `Expand ${item.activity}`
        }
      >
        <span className="checklist-number">
          {item.itemNumber}
        </span>

        <span className="checklist-toggle-content">
          <span className="checklist-phase">
            {item.phase}
          </span>

          <strong className="checklist-task-name">
            {item.activity}
          </strong>

          <span className="checklist-compact-time">
            <Clock3
              size={14}
              aria-hidden="true"
            />

            {isCompleted
              ? `Completed at ${
                  actualDisplay ||
                  "recorded time"
                }`
              : plannedDisplay
                ? `Planned ${plannedDisplay}`
                : "Awaiting Chocks On"}
          </span>

          <span className="checklist-allocation-summary">
            {formatDuration(
              item.allocationSec
            )}
          </span>

          {isOverdue ? (
            <span className="checklist-overdue-summary">
              {overdueLabel ||
                "Activity overdue"}
            </span>
          ) : null}
        </span>

        <span className="checklist-toggle-status">
          <span
            className={
              visibleStatus === "overdue"
                ? "activity-status status-overdue"
                : `activity-status status-${visibleStatus}`
            }
          >
            {visibleStatusLabel}
          </span>

          {isExpanded ? (
            <ChevronUp
              size={20}
              aria-hidden="true"
            />
          ) : (
            <ChevronDown
              size={20}
              aria-hidden="true"
            />
          )}
        </span>
      </button>

      {isExpanded ? (
        <div
          id={`task-details-${item.itemNumber}`}
          className="checklist-row-details"
        >
          {isOverdue ? (
            <div
              className="activity-overdue-alert"
              role="alert"
            >
              {overdueLabel ||
                "This activity is overdue."}
            </div>
          ) : null}

          <div className="checklist-times checklist-times-display">
            <div className="activity-time-display">
              <span>
                Planned
              </span>

              <strong>
                {plannedDisplay ||
                  "Awaiting Chocks On"}
              </strong>
            </div>

            <div className="activity-time-display">
              <span>
                Actual
              </span>

              <strong>
                {actualDisplay ||
                  "Not completed"}
              </strong>
            </div>
          </div>

          <div className="activity-allocation">
            <span>
              Task allocation
            </span>

            <strong>
              {formatDuration(
                item.allocationSec
              )}
            </strong>
          </div>

          <label className="observation-field">
            <span>
              Observation
            </span>

            <input
              type="text"
              value={
                row.observation || ""
              }
              onChange={
                handleObservationChange
              }
              placeholder="Operational observation"
              disabled={disabled}
              aria-label={
                `Observation for ${item.activity}`
              }
            />
          </label>

          <div className="checklist-result checklist-result-compact">
            <div className="activity-delay-summary">
              <span>
                Performance status
              </span>

              <strong>
                {isOverdue
                  ? overdueLabel ||
                    "Overdue"
                  : isCompleted
                    ? visibleStatusLabel
                    : formatDelay(
                        row.delaySeconds
                      )}
              </strong>
            </div>

            <button
              type="button"
              className={
                isCompleted
                  ? "mark-button completed"
                  : "mark-button"
              }
              onClick={handleMark}
              disabled={disabled}
              title={
                disabled
                  ? "This checklist is read-only"
                  : isCompleted
                    ? "Return this activity to pending"
                    : "Record the activity completion time"
              }
              aria-label={
                disabled
                  ? `${item.activity} is read-only`
                  : isCompleted
                    ? `Return ${item.activity} to pending`
                    : `Complete ${item.activity} now`
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
                ? `Completed at ${
                    actualDisplay ||
                    "recorded time"
                  }`
                : "Mark Complete"}
            </button>
          </div>
        </div>
      ) : null}
    </article>
  );
}