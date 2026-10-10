import AppLogo from "../AppLogo";
import {
  CHECKLIST_ITEMS,
} from "../../data/checklistItems";
import {
  formatDelay,
} from "../../utils/checklistTime";

const STATUS_LABELS = {
  pending: "Pending",
  ontime: "On Time",
  light: "Light Delay",
  delay: "Delay",
};

function formatReportDate(
  value
) {
  if (!value) {
    return "";
  }

  const [
    year,
    month,
    day,
  ] = String(value)
    .split("-");

  if (
    !year ||
    !month ||
    !day
  ) {
    return value;
  }

  return [
    day,
    month,
    year,
  ].join("/");
}

function formatGeneratedAt() {
  return new Intl.DateTimeFormat(
    "en-ZA",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone:
        "Africa/Johannesburg",
    }
  ).format(
    new Date()
  );
}

function getOverallAssessment(
  metrics
) {
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

function getAssessmentClass(
  metrics
) {
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
  operationalMetrics =
  metrics,
  preArrivalMetrics = null,
  plannedTimeFor,
  profile,
}) {
  const completedTotal =
    metrics.done;

  const overallAssessment =
    getOverallAssessment(
      operationalMetrics
    );

  const assessmentClass =
    getAssessmentClass(
      operationalMetrics
    );

  return (
    <article className="checklist-print-report">
      <header className="print-report-header">
        <AppLogo
          className="print-report-logo"
          alt="South African Airways"
        />

        <div className="print-report-title">
          <h1>
            OPS CHECK-LIST GRU -
            TURNAROUND REPORT
          </h1>

          <p>
            Generated:{" "}
            {formatGeneratedAt()}
          </p>
        </div>
      </header>

      <section className="print-report-section">
        <h2>
          FLIGHT INFORMATION
        </h2>

        <div className="print-flight-grid">
          <div>
            <span>Flight Date</span>
            <strong>
              {formatReportDate(
                flight.flightDate
              ) || "-"}
            </strong>
          </div>

          <div>
            <span>Flight In</span>
            <strong>
              {flight.flightIn ||
                "-"}
            </strong>
          </div>

          <div>
            <span>Flight Out</span>
            <strong>
              {flight.flightOut ||
                "-"}
            </strong>
          </div>

          <div>
            <span>Bay</span>
            <strong>
              {flight.bay ||
                "-"}
            </strong>
          </div>

          <div>
            <span>Aircraft</span>
            <strong>
              {flight.aircraftType ||
                "-"}
            </strong>
          </div>

          <div>
            <span>Registration</span>
            <strong>
              {flight.registration ||
                "-"}
            </strong>
          </div>

          <div>
            <span>STA Scheduled</span>
            <strong>
              {flight.sta ||
                "-"}
            </strong>
          </div>

          <div>
            <span>ETA MVT</span>
            <strong>
              {flight.eta ||
                "-"}
            </strong>
          </div>

          <div>
            <span>Landing Real</span>
            <strong>
              {flight.ata ||
                "-"}
            </strong>
          </div>

          <div>
            <span>Chocks On</span>
            <strong>
              {flight.chocksOn ||
                "-"}
            </strong>
          </div>

          <div>
            <span>STD Scheduled</span>
            <strong>
              {flight.std ||
                "-"}
            </strong>
          </div>

          <div>
            <span>Defined Push</span>
            <strong>
              {flight.definedPushTime ||
                flight.std ||
                "-"}
            </strong>
          </div>
        </div>
      </section>

      {preArrivalMetrics ? (
        <section className="print-report-section">
          <h2>
            PRE-ARRIVAL READINESS
          </h2>

          <div className="print-performance-grid">
            <div className="print-metric print-metric-blue">
              <span>
                Completed / Total
              </span>

              <strong>
                {preArrivalMetrics.done}/
                {preArrivalMetrics.total}
              </strong>
            </div>

            <div className="print-metric print-metric-green">
              <span>
                Ready on Time
              </span>

              <strong>
                {preArrivalMetrics.ontime}
              </strong>
            </div>

            <div className="print-metric print-metric-gold">
              <span>
                Slightly Delayed
              </span>

              <strong>
                {preArrivalMetrics.light}
              </strong>
            </div>

            <div className="print-metric print-metric-red">
              <span>
                Delayed
              </span>

              <strong>
                {preArrivalMetrics.delay}
              </strong>
            </div>
          </div>

          <div className="print-readiness-note">
            Pre-Arrival activities are planned
            against STA and reported separately
            from turnaround operational
            performance.
          </div>
        </section>
      ) : null}

      <section className="print-report-section">
        <h2>
          TURNAROUND OPERATION PERFORMANCE
        </h2>

        <div className="print-performance-grid">
          <div className="print-metric print-metric-green">
            <span>On Time</span>
            <strong>
              {operationalMetrics.ontime}
            </strong>
          </div>

          <div className="print-metric print-metric-gold">
            <span>Light Delay</span>
            <strong>
              {operationalMetrics.light}
            </strong>
          </div>

          <div className="print-metric print-metric-red">
            <span>Delay</span>
            <strong>
              {operationalMetrics.delay}
            </strong>
          </div>

          <div className="print-metric print-metric-blue">
            <span>
              Checklist Completed / Total
            </span>
            <strong>
              {completedTotal}/
              {CHECKLIST_ITEMS.length}
            </strong>
          </div>
        </div>
      </section>

      <section className="print-report-section">
        <h2>
          OPERATION QUALITY ASSESSMENT
        </h2>

        <div
          className={
            `print-assessment ${assessmentClass}`
          }
        >
          <strong>
            {overallAssessment}
          </strong>

          <p>
            Checklist completion:
            {" "}
            {completedTotal} of{" "}
            {CHECKLIST_ITEMS.length}
            {" "}activities.
          </p>

          <p>
            Operational activities only.
            On time:{" "}
            {operationalMetrics.ontime}.
            Light delay:{" "}
            {operationalMetrics.light}.
            Delay:{" "}
            {operationalMetrics.delay}.
          </p>
        </div>
      </section>

      <section className="print-report-section print-activity-section">
        <h2>
          ACTIVITY DETAILS
        </h2>

        <table className="print-activity-table">
          <thead>
            <tr>
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
            {CHECKLIST_ITEMS.map(
              (item, index) => {
                const row =
                  rows[index];

                return (
                  <tr key={item.taskCode}>
                    <td>
                      {item.phase}
                    </td>

                    <td>
                      {item.activity}
                    </td>

                    <td>
                      {plannedTimeFor(
                        index
                      ) || "-"}
                    </td>

                    <td>
                      {row?.actualTime ||
                        "-"}
                    </td>

                    <td>
                      {row?.delaySeconds ===
                        null
                        ? "-"
                        : formatDelay(
                          row.delaySeconds
                        )}
                    </td>

                    <td
                      className={
                        `print-status print-status-${row?.status ||
                        "pending"
                        }`
                      }
                    >
                      {STATUS_LABELS[
                        row?.status
                      ] || "Pending"}
                    </td>

                    <td>
                      {row?.observation ||
                        ""}
                    </td>
                  </tr>
                );
              }
            )}
          </tbody>
        </table>
      </section>

      <footer className="print-report-footer">
        <div>
          Generated by OPS Check-List GRU
        </div>

        <div>
          South African Airways -
          GRU Station
        </div>

        <div>
          Coordinator:{" "}
          {flight.trcCoordinator ||
            profile?.full_name ||
            "-"}
        </div>
      </footer>
    </article>
  );
}