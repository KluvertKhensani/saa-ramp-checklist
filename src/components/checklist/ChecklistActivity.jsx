import { Check } from "lucide-react";

import { formatDelay } from "../../utils/checklistTime";

const STATUS_LABELS = {
  pending: "Pending",
  ontime: "On Time",
  light: "Light Delay",
  delay: "Delay",
};

export default function ChecklistActivity({
  item,
  row,
  plannedTime,
  onActualChange,
  onObservationChange,
  onMark,
  disabled = false,
}) {
  const isCompleted =
    row.status !== "pending";

  const rowClassName = disabled
    ? "checklist-row checklist-row-readonly"
    : "checklist-row";

  const markButtonClassName = isCompleted
    ? "mark-button completed"
    : "mark-button";

  function handleActualChange(event) {
    if (disabled) {
      return;
    }

    onActualChange(event.target.value);
  }

  function handleObservationChange(event) {
    if (disabled) {
      return;
    }

    onObservationChange(event.target.value);
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
      <div className="checklist-number">
        {item.itemNumber}
      </div>

      <div className="checklist-main">
        <span className="checklist-phase">
          {item.phase}
        </span>

        <h3>{item.activity}</h3>

        <div className="checklist-times">
          <label>
            <span>Planned</span>

            <input
              value={plannedTime}
              readOnly
              placeholder="Awaiting base time"
              aria-label={`Planned time for ${item.activity}`}
            />
          </label>

          <label>
            <span>Actual</span>

            <input
              type="time"
              step="1"
              value={row.actualTime}
              onChange={handleActualChange}
              disabled={disabled}
              aria-label={`Actual time for ${item.activity}`}
            />
          </label>
        </div>

        <label className="observation-field">
          <span>Observation</span>

          <input
            value={row.observation}
            onChange={handleObservationChange}
            placeholder="Operational observation"
            disabled={disabled}
            aria-label={`Observation for ${item.activity}`}
          />
        </label>
      </div>

        <div className="checklist-result">
            <span
            className={`activity-status status-${row.status}`}
            >
            {STATUS_LABELS[row.status] || "Pending"}
            </span>

            <small>
            {formatDelay(row.delaySeconds)}
            </small>

            <button
            type="button"
            className={markButtonClassName}
            onClick={handleMark}
            disabled={disabled}
            title={
                disabled
                ? "This checklist is read-only"
                : isCompleted
                    ? "Return this activity to pending"
                    : "Mark this activity as completed"
            }
            aria-label={
                disabled
                ? `${item.activity} is read-only`
                : isCompleted
                    ? `Return ${item.activity} to pending`
                    : `Mark ${item.activity} as completed`
            }
            >
            <Check
                size={17}
                aria-hidden="true"
            />

            {isCompleted
                ? "Completed"
                : "Mark Done"}
            </button>
        </div>
        </article>
    );
    }