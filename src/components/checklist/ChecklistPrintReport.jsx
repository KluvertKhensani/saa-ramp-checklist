import AppLogo from "../AppLogo";

import { CHECKLIST_ITEMS } from "../../data/checklistItems";

import { formatDelay } from "../../utils/checklistTime";

const STATUS_LABELS = {
  pending: "Pending",
  ontime: "On Time",
  light: "Slightly Delayed",
  delay: "Delayed",
};

function getTaskScope(phase) {
  return phase === "Pre-Arrival"
    ? "Pre-Arrival Readiness"
    : "Turnaround Operation";
}

function displayTime(value) {
  if (!value) {
    return "-";
  }

  return String(value).slice(0, 5);
}

function formatReportDate(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] = String(value).split("-");

  if (!year || !month || !day) {
    return String(value);
  }

  return [day, month, year].join("/");
}

function formatGeneratedAt() {
  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Africa/Johannesburg",
  }).format(new Date());
}

function getOverallAssessment(metrics) {
  if (metrics.delay > 0) {
    return "Action Required";
  }

  if (metrics.light > 0) {
    return "Good Performance";
  }

  if (metrics.done === 0) {
    return "Awaiting Activities";
  }

  return "Good Performance";
}

function getAssessmentClass(metrics) {
  if (metrics.delay > 0) {
    return "print-assessment-delay";
  }

  if (metrics.light > 0) {
    return "print-assessment-light";
  }

  return "print-assessment-good";
}

export default function ChecklistPrintReport({
  flight,
  rows,
  metrics,
  operationalMetrics = metrics,
  preArrivalMetrics = null,
  plannedTimeFor,
  profile,
}) {
  const completedTotal = metrics.done || 0;

  const checklistTotal = metrics.total || CHECKLIST_ITEMS.length;

  const overallAssessment = getOverallAssessment(operationalMetrics);

  const assessmentClass = getAssessmentClass(operationalMetrics);

  return (
    <article className="checklist-print-report">
      <header className="print-report-header">
        <AppLogo className="print-report-logo" alt="South African Airways" />

        <div className="print-report-title">
          <h1>OPS CHECK-LIST GRU - TURNAROUND REPORT</h1>

          <p>Generated: {formatGeneratedAt()}</p>
        </div>
      </header>

      <section className="print-report-section">
        <h2>FLIGHT INFORMATION</h2>

        <div className="print-flight-grid">
          <div>
            <span>Flight Date</span>

            <strong>{formatReportDate(flight.flightDate) || "-"}</strong>
          </div>

          <div>
            <span>Flight In</span>

            <strong>{flight.flightIn || "-"}</strong>
          </div>

          <div>
            <span>Flight Out</span>

            <strong>{flight.flightOut || "-"}</strong>
          </div>

          <div>
            <span>Bay</span>

            <strong>{flight.bay || "-"}</strong>
          </div>

          <div>
            <span>Aircraft</span>

            <strong>{flight.aircraftType || "-"}</strong>
          </div>

          <div>
            <span>Registration</span>

            <strong>{flight.registration || "-"}</strong>
          </div>

          <div>
            <span>STA Scheduled</span>

            <strong>{displayTime(flight.sta)}</strong>
          </div>

          <div>
            <span>ETA MVT Update</span>

            <strong>{displayTime(flight.eta)}</strong>
          </div>

          <div>
            <span>ATA Real</span>

            <strong>{displayTime(flight.ata)}</strong>
          </div>

          <div>
            <span>Chocks On Real</span>

            <strong>{displayTime(flight.chocksOn)}</strong>
          </div>

          <div>
            <span>STD Scheduled</span>

            <strong>{displayTime(flight.std)}</strong>
          </div>

          <div>
            <span>Defined Push</span>

            <strong>{displayTime(flight.definedPushTime || flight.std)}</strong>
          </div>
        </div>
      </section>

      {preArrivalMetrics ? (
        <section className="print-report-section">
          <h2>PRE-ARRIVAL READINESS</h2>

          <div className="print-performance-grid">
            <div className="print-metric print-metric-blue">
              <span>Completed / Total</span>

              <strong>
                {preArrivalMetrics.done}/{preArrivalMetrics.total}
              </strong>
            </div>

            <div className="print-metric print-metric-green">
              <span>Ready on Time</span>

              <strong>{preArrivalMetrics.ontime}</strong>
            </div>

            <div className="print-metric print-metric-gold">
              <span>Slightly Delayed</span>

              <strong>{preArrivalMetrics.light}</strong>
            </div>

            <div className="print-metric print-metric-red">
              <span>Delayed</span>

              <strong>{preArrivalMetrics.delay}</strong>
            </div>
          </div>

          <div className="print-readiness-note">
            Pre-Arrival activities are planned against STA and reported
            separately from turnaround operational performance.
          </div>
        </section>
      ) : null}

      <section className="print-report-section">
        <h2>TURNAROUND OPERATION PERFORMANCE</h2>

        <div className="print-performance-grid">
          <div className="print-metric print-metric-green">
            <span>On Time</span>

            <strong>{operationalMetrics.ontime}</strong>
          </div>

          <div className="print-metric print-metric-gold">
            <span>Slightly Delayed</span>

            <strong>{operationalMetrics.light}</strong>
          </div>

          <div className="print-metric print-metric-red">
            <span>Delayed</span>

            <strong>{operationalMetrics.delay}</strong>
          </div>

          <div className="print-metric print-metric-blue">
            <span>Operational Completed / Total</span>

            <strong>
              {operationalMetrics.done}/{operationalMetrics.total}
            </strong>
          </div>
        </div>
      </section>

      <section className="print-report-section">
        <h2>OPERATION QUALITY ASSESSMENT</h2>

        <div className={`print-assessment ${assessmentClass}`}>
          <strong>{overallAssessment}</strong>

          <p>
            Operational completion: {operationalMetrics.done} of{" "}
            {operationalMetrics.total} Arrival and Departure activities.
          </p>

          <p>
            Full checklist completion: {completedTotal} of {checklistTotal}{" "}
            activities.
          </p>

          <p>
            Operational activities only. On time: {operationalMetrics.ontime}.
            Slightly delayed: {operationalMetrics.light}. Delayed:{" "}
            {operationalMetrics.delay}.
          </p>
        </div>
      </section>

      <section className="print-report-section print-activity-section">
        <h2>ACTIVITY DETAILS</h2>

        <table className="print-activity-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Task Code</th>
              <th>Scope</th>
              <th>Phase</th>
              <th>Activity</th>
              <th>Planned</th>
              <th>Actual</th>
              <th>Delay</th>
              <th>Status</th>
              <th>Comment</th>
            </tr>
          </thead>

          <tbody>
            {CHECKLIST_ITEMS.map((item, index) => {
              const row = rows[index] || {};

              const delayDisplay =
                row.delaySeconds === null || row.delaySeconds === undefined
                  ? "-"
                  : formatDelay(row.delaySeconds);

              return (
                <tr key={item.taskCode}>
                  <td>{item.itemNumber}</td>

                  <td>{item.taskCode}</td>

                  <td>{getTaskScope(item.phase)}</td>

                  <td>{item.phase}</td>

                  <td>{item.activity}</td>

                  <td>{displayTime(plannedTimeFor(index))}</td>

                  <td>{displayTime(row.actualTime)}</td>

                  <td>{delayDisplay}</td>

                  <td
                    className={`print-status print-status-${
                      row.status || "pending"
                    }`}
                  >
                    {STATUS_LABELS[row.status] || "Pending"}
                  </td>

                  <td>{row.observation?.trim() || ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <footer className="print-report-footer">
        <div>Generated by OPS Check-List GRU</div>

        <div>South African Airways - GRU Station</div>

        <div>
          Coordinator: {flight.trcCoordinator || profile?.full_name || "-"}
        </div>
      </footer>
    </article>
  );
}
