function formatTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 5);
}

function formatDelaySeconds(value) {
  const seconds = Number(value);

  if (!Number.isFinite(seconds)) {
    return "-";
  }

  const minutes = seconds / 60;

  if (minutes <= 0) {
    return "On time";
  }

  return `${minutes.toFixed(1)} min`;
}

function statusLabel(status) {
  switch (status) {
    case "on_time":
      return "On Time";

    case "light_delay":
      return "Slightly Delayed";

    case "delay":
      return "Delayed";

    default:
      return "Pending";
  }
}

function statusClass(status) {
  switch (status) {
    case "on_time":
      return "status-ontime";

    case "light_delay":
      return "status-light";

    case "delay":
      return "status-delay";

    default:
      return "status-pending";
  }
}

export default function ReportingMatrix({ rows }) {
  return (
    <section className="reporting-matrix-card">
      <div className="reporting-section-heading">
        <div>
          <span>Detailed analysis</span>
          <h3>Operational Performance Matrix</h3>
        </div>

        <strong>{rows.length} records</strong>
      </div>

      {rows.length === 0 ? (
        <div className="reporting-empty-state">
          No checklist activities match the selected filters.
        </div>
      ) : (
        <div className="reporting-matrix-wrapper">
          <table className="reporting-matrix">
            <thead>
              <tr>
                <th>Flight Date</th>
                <th>Flight</th>
                <th>Aircraft</th>
                <th>Registration</th>
                <th>Task</th>
                <th>Phase</th>
                <th>Activity</th>
                <th>Impact</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Variance</th>
                <th>Status</th>
                <th>Observation</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.checklistId}-${row.taskCode}-${index}`}
                  className={
                    row.operationalStatus === "delay"
                      ? "reporting-matrix-delay-row"
                      : ""
                  }
                >
                  <td>{row.flightDate || "-"}</td>
                  <td>{row.flightOut || "-"}</td>
                  <td>{row.aircraftType || "-"}</td>
                  <td>{row.registration || "-"}</td>
                  <td>{row.taskCode || "-"}</td>
                  <td>{row.phase || "-"}</td>
                  <td>{row.activity || "-"}</td>
                  <td>{row.impactCategory || "-"}</td>
                  <td>{formatTime(row.plannedTime)}</td>
                  <td>{formatTime(row.actualTime)}</td>
                  <td>
                    {formatDelaySeconds(row.delaySeconds)}
                  </td>
                  <td>
                    <span
                      className={`activity-status ${statusClass(
                        row.operationalStatus,
                      )}`}
                    >
                      {statusLabel(row.operationalStatus)}
                    </span>
                  </td>
                  <td>{row.observation || "No comment"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}