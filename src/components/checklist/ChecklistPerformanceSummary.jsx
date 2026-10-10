import {
    ArrowLeft,
    BarChart3,
    ClipboardCheck,
    Download,
    ShieldAlert,
} from "lucide-react";

import {
    CHECKLIST_ITEMS,
} from "../../data/checklistItems";
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
        return "-";
    }

    return String(value).slice(
        0,
        5
    );
}

function getImpactLabel(
    impactCategory
) {
    switch (impactCategory) {
        case "high":
            return "High Impact";

        case "low":
            return "Low Impact";

        default:
            return "Medium Impact";
    }
}

function getCompletionPercentage(
    done,
    total
) {
    if (!total) {
        return 0;
    }

    return Math.round(
        done / total * 100
    );
}

export default function ChecklistPerformanceSummary({
    flight,
    rows,
    metrics,
    operationalMetrics,
    preArrivalMetrics,
    plannedTimeFor,
    canExport = false,
    onBack,
    onExport,
}) {
    const completedActivities =
        CHECKLIST_ITEMS
            .map((item, index) => ({
                item,
                row: rows[index],
                plannedTime:
                    plannedTimeFor(index),
            }))
            .filter(
                ({ row }) =>
                    row &&
                    row.status !==
                    "pending"
            );

    const highImpactExceptions =
        completedActivities.filter(
            ({ item, row }) =>
                item.impactCategory ===
                "high" &&
                (
                    row.status ===
                    "light" ||
                    row.status ===
                    "delay"
                )
        );

    const completionPercentage =
        getCompletionPercentage(
            metrics.done,
            metrics.total
        );

    return (
        <section className="performance-summary-view">
            <div className="performance-summary-navigation">
                <button
                    type="button"
                    className="ramp-button ramp-button-light"
                    onClick={onBack}
                >
                    <ArrowLeft
                        size={17}
                        aria-hidden="true"
                    />

                    Back to Checklist
                </button>

                {canExport &&
                    flight.flightOut ? (
                    <button
                        type="button"
                        className="ramp-button ramp-button-primary"
                        onClick={onExport}
                    >
                        <Download
                            size={17}
                            aria-hidden="true"
                        />

                        Export Reporting Data
                    </button>
                ) : null}
            </div>

            <header className="performance-summary-header">
                <div>
                    <span className="performance-summary-eyebrow">
                        Performance Summary
                    </span>

                    <h2>
                        Turnaround Analysis
                    </h2>

                    <p>
                        {flight.flightOut
                            ? `Flight ${flight.flightOut}`
                            : "Current checklist"}
                        {flight.flightDate
                            ? ` on ${flight.flightDate}`
                            : ""}
                    </p>
                </div>

                <div className="performance-completion-ring">
                    <strong>
                        {completionPercentage}%
                    </strong>

                    <span>
                        Checklist completion
                    </span>
                </div>
            </header>

            <div className="performance-summary-cards">
                <article className="performance-summary-card">
                    <ClipboardCheck
                        size={22}
                        aria-hidden="true"
                    />

                    <span>
                        Checklist Completed
                    </span>

                    <strong>
                        {metrics.done}/
                        {metrics.total}
                    </strong>

                    <small>
                        All phases
                    </small>
                </article>

                <article className="performance-summary-card performance-card-green">
                    <BarChart3
                        size={22}
                        aria-hidden="true"
                    />

                    <span>
                        Operational On Time
                    </span>

                    <strong>
                        {
                            operationalMetrics
                                .ontime
                        }
                    </strong>

                    <small>
                        Arrival and Departure
                    </small>
                </article>

                <article className="performance-summary-card performance-card-gold">
                    <BarChart3
                        size={22}
                        aria-hidden="true"
                    />

                    <span>
                        Operational Light Delay
                    </span>

                    <strong>
                        {
                            operationalMetrics
                                .light
                        }
                    </strong>

                    <small>
                        Arrival and Departure
                    </small>
                </article>

                <article className="performance-summary-card performance-card-red">
                    <ShieldAlert
                        size={22}
                        aria-hidden="true"
                    />

                    <span>
                        Operational Delay
                    </span>

                    <strong>
                        {
                            operationalMetrics
                                .delay
                        }
                    </strong>

                    <small>
                        Arrival and Departure
                    </small>
                </article>

                <article className="performance-summary-card performance-card-red">
                    <ShieldAlert
                        size={22}
                        aria-hidden="true"
                    />

                    <span>
                        High-Impact Exceptions
                    </span>

                    <strong>
                        {
                            highImpactExceptions
                                .length
                        }
                    </strong>

                    <small>
                        Completed late
                    </small>
                </article>
            </div>

            <section className="performance-analysis-section">
                <div className="performance-section-heading">
                    <div>
                        <span>
                            Pre-Arrival
                        </span>

                        <h3>
                            Readiness Analysis
                        </h3>
                    </div>

                    <strong>
                        {preArrivalMetrics.done}/
                        {preArrivalMetrics.total}
                    </strong>
                </div>

                <div className="performance-analysis-grid">
                    <div>
                        <span>
                            Pending
                        </span>

                        <strong>
                            {
                                preArrivalMetrics
                                    .pending
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            Ready on Time
                        </span>

                        <strong>
                            {
                                preArrivalMetrics
                                    .ontime
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            Slightly Delayed
                        </span>

                        <strong>
                            {
                                preArrivalMetrics
                                    .light
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            Delayed
                        </span>

                        <strong>
                            {
                                preArrivalMetrics
                                    .delay
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            High-Impact Exceptions
                        </span>

                        <strong>
                            {
                                preArrivalMetrics
                                    .highImpactDelay
                            }
                        </strong>
                    </div>
                </div>

                <p className="performance-analysis-note">
                    Pre-Arrival activities are
                    measured against STA and are
                    shown separately from turnaround
                    operational performance.
                </p>
            </section>

            <section className="performance-analysis-section">
                <div className="performance-section-heading">
                    <div>
                        <span>
                            Turnaround
                        </span>

                        <h3>
                            Operational Performance
                        </h3>
                    </div>

                    <strong>
                        {
                            operationalMetrics
                                .done
                        }
                        /
                        {
                            operationalMetrics
                                .total
                        }
                    </strong>
                </div>

                <div className="performance-analysis-grid">
                    <div>
                        <span>
                            Pending
                        </span>

                        <strong>
                            {
                                operationalMetrics
                                    .pending
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            On Time
                        </span>

                        <strong>
                            {
                                operationalMetrics
                                    .ontime
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            Slightly Delayed
                        </span>

                        <strong>
                            {
                                operationalMetrics
                                    .light
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            Delayed
                        </span>

                        <strong>
                            {
                                operationalMetrics
                                    .delay
                            }
                        </strong>
                    </div>

                    <div>
                        <span>
                            High-Impact Exceptions
                        </span>

                        <strong>
                            {
                                operationalMetrics
                                    .highImpactDelay
                            }
                        </strong>
                    </div>
                </div>
            </section>

            <section className="performance-analysis-section">
                <div className="performance-section-heading">
                    <div>
                        <span>
                            Completed Activities
                        </span>

                        <h3>
                            Performance Detail
                        </h3>
                    </div>

                    <strong>
                        {
                            completedActivities
                                .length
                        }
                    </strong>
                </div>

                {completedActivities.length ===
                    0 ? (
                    <div className="performance-empty-state">
                        No completed activities are
                        available yet.
                    </div>
                ) : (
                    <div className="performance-table-wrapper">
                        <table className="performance-detail-table">
                            <thead>
                                <tr>
                                    <th>Phase</th>
                                    <th>Activity</th>
                                    <th>Impact</th>
                                    <th>Planned</th>
                                    <th>Actual</th>
                                    <th>Variance</th>
                                    <th>Status</th>
                                    <th>Comment</th>
                                </tr>
                            </thead>

                            <tbody>
                                {completedActivities.map(
                                    ({
                                        item,
                                        row,
                                        plannedTime,
                                    }) => (
                                        <tr
                                            key={
                                                item.taskCode
                                            }
                                        >
                                            <td>
                                                {item.phase}
                                            </td>

                                            <td>
                                                {item.activity}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        `task-impact-badge task-impact-${item.impactCategory}`
                                                    }
                                                >
                                                    {getImpactLabel(
                                                        item.impactCategory
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                {displayTime(
                                                    plannedTime
                                                )}
                                            </td>

                                            <td>
                                                {displayTime(
                                                    row.actualTime
                                                )}
                                            </td>

                                            <td>
                                                {formatDelay(
                                                    row.delaySeconds
                                                )}
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        `activity-status status-${row.status}`
                                                    }
                                                >
                                                    {
                                                        STATUS_LABELS[
                                                        row.status
                                                        ] ||
                                                        "Pending"
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                {
                                                    row.observation ||
                                                    "-"
                                                }
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            <section className="performance-analysis-section">
                <div className="performance-section-heading">
                    <div>
                        <span>
                            Reporting
                        </span>

                        <h3>
                            Power BI Reporting Model
                        </h3>
                    </div>
                </div>

                <div className="power-bi-model-grid">
                    <article>
                        <strong>
                            FactTurnaround
                        </strong>

                        <span>
                            One record for the current
                            flight turnaround, milestones,
                            completion totals, operational
                            results, and readiness totals.
                        </span>
                    </article>

                    <article>
                        <strong>
                            FactTaskPerformance
                        </strong>

                        <span>
                            One record per checklist
                            activity, including planned and
                            actual times, variance, status,
                            impact, and observation.
                        </span>
                    </article>

                    <article>
                        <strong>
                            DimTask
                        </strong>

                        <span>
                            Stable task definitions using
                            task code, phase, scope, timing
                            base, offset, and impact
                            category.
                        </span>
                    </article>
                </div>

                <p className="performance-analysis-note">
                    Import the three exported CSV files
                    into Power BI and relate the two fact
                    tables to DimTask using task_code
                    where applicable.
                </p>
                 </section>
    </section>
  );
}