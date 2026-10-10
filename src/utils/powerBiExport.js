function escapeCsvValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text =
    String(value);

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n")
  ) {
    return `"${text.replace(
      /"/g,
      '""'
    )}"`;
  }

  return text;
}

function createCsv(
  headers,
  records
) {
  const headerRow =
    headers
      .map(escapeCsvValue)
      .join(",");

  const dataRows =
    records.map((record) =>
      headers
        .map((header) =>
          escapeCsvValue(
            record[header]
          )
        )
        .join(",")
    );

  return [
    headerRow,
    ...dataRows,
  ].join("\n");
}

function downloadCsv(
  fileName,
  content
) {
  const blob =
    new Blob(
      [
        "\uFEFF",
        content,
      ],
      {
        type:
          "text/csv;charset=utf-8",
      }
    );

  const downloadUrl =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  link.href =
    downloadUrl;

  link.download =
    fileName;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  window.setTimeout(() => {
    URL.revokeObjectURL(
      downloadUrl
    );
  }, 1000);
}

function getStatusLabel(
  status
) {
  switch (status) {
    case "ontime":
      return "On Time";

    case "light":
      return "Slightly Delayed";

    case "delay":
      return "Delayed";

    default:
      return "Pending";
  }
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

function getTaskScope(
  phase
) {
  return phase ===
    "Pre-Arrival"
    ? "Pre-Arrival Readiness"
    : "Turnaround Operation";
}

export function exportPowerBiData({
  checklistId,
  flight,
  rows,
  checklistItems,
  plannedTimeFor,
  metrics,
  operationalMetrics,
  preArrivalMetrics,
}) {
  const exportedAt =
    new Date()
      .toISOString();

  const taskRecords =
    checklistItems.map(
      (item, index) => {
        const row =
          rows[index] || {};

        const delayMinutes =
          row.delaySeconds ===
            null ||
          row.delaySeconds ===
            undefined
            ? null
            : row.delaySeconds /
              60;

        return {
          checklist_id:
            checklistId || "",
          flight_date:
            flight.flightDate ||
            "",
          flight_in:
            flight.flightIn ||
            "",
          flight_out:
            flight.flightOut ||
            "",
          aircraft_type:
            flight.aircraftType ||
            "",
          registration:
            flight.registration ||
            "",
          bay:
            flight.bay ||
            "",
          task_code:
            item.taskCode,
          task_number:
            item.itemNumber,
          phase:
            item.phase,
          reporting_scope:
            getTaskScope(
              item.phase
            ),
          activity:
            item.activity,
          timing_base:
            item.base,
          planned_offset_seconds:
            item.offsetSec,
          planned_time:
            plannedTimeFor(
              index
            ) || "",
          actual_time:
            row.actualTime ||
            "",
          delay_seconds:
            row.delaySeconds ??
            "",
          delay_minutes:
            delayMinutes ?? "",
          timing_status:
            getStatusLabel(
              row.status
            ),
          impact_category:
            getImpactLabel(
              item.impactCategory
            ),
          observation:
            row.observation ||
            "",
          started_at:
            row.startedAt ||
            "",
          started_by:
            row.startedBy ||
            "",
          exported_at:
            exportedAt,
        };
      }
    );

  const turnaroundRecords = [
    {
      checklist_id:
        checklistId || "",
      flight_date:
        flight.flightDate ||
        "",
      flight_in:
        flight.flightIn ||
        "",
      flight_out:
        flight.flightOut ||
        "",
      bay:
        flight.bay ||
        "",
      aircraft_type:
        flight.aircraftType ||
        "",
      registration:
        flight.registration ||
        "",
      sta:
        flight.sta ||
        "",
      eta:
        flight.eta ||
        "",
      ata:
        flight.ata ||
        "",
      chocks_on:
        flight.chocksOn ||
        "",
      std:
        flight.std ||
        "",
      defined_push_time:
        flight.definedPushTime ||
        flight.std ||
        "",
      coordinator:
        flight.trcCoordinator ||
        "",
      checklist_total:
        metrics.total,
      checklist_completed:
        metrics.done,
      checklist_pending:
        metrics.pending,
      operational_total:
        operationalMetrics.total,
      operational_completed:
        operationalMetrics.done,
      operational_pending:
        operationalMetrics.pending,
      operational_on_time:
        operationalMetrics.ontime,
      operational_light_delay:
        operationalMetrics.light,
      operational_delay:
        operationalMetrics.delay,
      operational_high_impact_exceptions:
        operationalMetrics
          .highImpactDelay,
      pre_arrival_total:
        preArrivalMetrics.total,
      pre_arrival_completed:
        preArrivalMetrics.done,
      pre_arrival_pending:
        preArrivalMetrics.pending,
      pre_arrival_on_time:
        preArrivalMetrics.ontime,
      pre_arrival_light_delay:
        preArrivalMetrics.light,
      pre_arrival_delay:
        preArrivalMetrics.delay,
      pre_arrival_high_impact_exceptions:
        preArrivalMetrics
          .highImpactDelay,
      exported_at:
        exportedAt,
    },
  ];

  const taskDimensionRecords =
    checklistItems.map(
      (item) => ({
        task_code:
          item.taskCode,
        task_number:
          item.itemNumber,
        phase:
          item.phase,
        reporting_scope:
          getTaskScope(
            item.phase
          ),
        activity:
          item.activity,
        timing_base:
          item.base,
        planned_offset_seconds:
          item.offsetSec,
        impact_category:
          getImpactLabel(
            item.impactCategory
          ),
      })
    );

  const taskHeaders = [
    "checklist_id",
    "flight_date",
    "flight_in",
    "flight_out",
    "aircraft_type",
    "registration",
    "bay",
    "task_code",
    "task_number",
    "phase",
    "reporting_scope",
    "activity",
    "timing_base",
    "planned_offset_seconds",
    "planned_time",
    "actual_time",
    "delay_seconds",
    "delay_minutes",
    "timing_status",
    "impact_category",
    "observation",
    "started_at",
    "started_by",
    "exported_at",
  ];

  const turnaroundHeaders = [
    "checklist_id",
    "flight_date",
    "flight_in",
    "flight_out",
    "bay",
    "aircraft_type",
    "registration",
    "sta",
    "eta",
    "ata",
    "chocks_on",
    "std",
    "defined_push_time",
    "coordinator",
    "checklist_total",
    "checklist_completed",
    "checklist_pending",
    "operational_total",
    "operational_completed",
    "operational_pending",
    "operational_on_time",
    "operational_light_delay",
    "operational_delay",
    "operational_high_impact_exceptions",
    "pre_arrival_total",
    "pre_arrival_completed",
    "pre_arrival_pending",
    "pre_arrival_on_time",
    "pre_arrival_light_delay",
    "pre_arrival_delay",
    "pre_arrival_high_impact_exceptions",
    "exported_at",
  ];

  const taskDimensionHeaders = [
    "task_code",
    "task_number",
    "phase",
    "reporting_scope",
    "activity",
    "timing_base",
    "planned_offset_seconds",
    "impact_category",
  ];

  downloadCsv(
    "PTS_FactTaskPerformance.csv",
    createCsv(
      taskHeaders,
      taskRecords
    )
  );

  window.setTimeout(() => {
    downloadCsv(
      "PTS_FactTurnaround.csv",
      createCsv(
        turnaroundHeaders,
        turnaroundRecords
      )
    );
  }, 250);

  window.setTimeout(() => {
    downloadCsv(
      "PTS_DimTask.csv",
      createCsv(
        taskDimensionHeaders,
        taskDimensionRecords
      )
    );
  }, 500);
}