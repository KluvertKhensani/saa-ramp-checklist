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
}) {
  return (
    <article className="checklist-row">
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
            />
          </label>

          <label>
            <span>Actual</span>
            <input
              type="time"
              step="1"
              value={row.actualTime}
              onChange={(event) =>
                onActualChange(event.target.value)
              }
            />
          </label>
        </div>

        <label className="observation-field">
          <span>Observation</span>
          <input
            value={row.observation}
            onChange={(event) =>
              onObservationChange(event.target.value)
            }
            placeholder="Operational observation"
          />
        </label>
      </div>

      <div className="checklist-result">
        <span
          className={`activity-status status-${row.status}`}
        >
          {STATUS_LABELS[row.status] || "Pending"}
        </span>

        <small>{formatDelay(row.delaySeconds)}</small>

        <button
          type="button"
          className={
            row.status === "pending"
              ? "mark-button"
              : "mark-button completed"
          }
          onClick={onMark}
        >
          <Check size={17} />

          {row.status === "pending"
            ? "Mark Done"
            : "Completed"}
        </button>
      </div>
    </article>
  );
}