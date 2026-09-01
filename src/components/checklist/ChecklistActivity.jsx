import {
  Check,
  ChevronDown,
  ChevronUp,
  Clock3,
  RotateCcw,
} from "lucide-react";
import { useState } from "react";

import { formatDelay } from "../../utils/checklistTime";

const STATUS_LABELS = {
  pending: "Pending",
  ontime: "On Time",
  light: "Light Delay",
  delay: "Delay",
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
  onObservationChange,
  onMark,
  disabled = false,
}) {
  const [expanded, setExpanded] =
    useState(false);

  const isCompleted =
    row.status !== "pending";

  const plannedDisplay =
    displayTime(plannedTime);

  const actualDisplay =
    displayTime(row.actualTime);

  const rowClassName = [
    "checklist-row",
    disabled
      ? "checklist-row-readonly"
      : "",
    expanded
      ? "checklist-row-expanded"
      : "checklist-row-collapsed",
  ]
    .filter(Boolean)
    .join(" ");

  function toggleExpanded() {
    setExpanded(
      (currentValue) =>
        !currentValue
    );
  }

  function handleObservationChange(event) {
    if (disabled) {
      return;
    }

    onObservationChange(
      event.target.value
    );
  }

  function handleMark() {
    if (disabled) {
      return;
    }

    onMark();
  }

  return (
    <article
      className={rowClassName}
      aria-readonly={disabled}
    >
      <button
        type="button"
        className="checklist-row-toggle"
        onClick={toggleExpanded}
        aria-expanded={expanded}
        aria-controls={`task-details-${item.itemNumber}`}
        aria-label={
          expanded
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
                : "Awaiting base time"}
          </span>
        </span>

        <span className="checklist-toggle-status">
          <span
            className={`activity-status status-${row.status}`}
          >
            {STATUS_LABELS[row.status] ||
              "Pending"}
          </span>

          {expanded ? (
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

      {expanded ? (
        <div
          id={`task-details-${item.itemNumber}`}
          className="checklist-row-details"
        >
          <div className="checklist-times checklist-times-display">
            <div className="activity-time-display">
              <span>Planned</span>

              <strong>
                {plannedDisplay ||
                  "Awaiting base time"}
              </strong>
            </div>

            <div className="activity-time-display">
              <span>Actual</span>

              <strong>
                {actualDisplay ||
                  "Not completed"}
              </strong>
            </div>
          </div>

          <label className="observation-field">
            <span>Observation</span>

            <input
              value={row.observation}
              onChange={
                handleObservationChange
              }
              placeholder="Operational observation"
              disabled={disabled}
              aria-label={`Observation for ${item.activity}`}
            />
          </label>

          <div className="checklist-result checklist-result-compact">
            <div className="activity-delay-summary">
              <span>Delay status</span>

              <strong>
                {formatDelay(
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