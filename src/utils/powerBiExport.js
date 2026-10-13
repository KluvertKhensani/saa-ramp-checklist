function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function calculatePercentage(completed, total) {
  if (!total) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

function escapeCsvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  let text = String(value);

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function createCsv(headers, records) {
  const headerRow = headers.map(escapeCsvValue).join(",");

  const dataRows = records.map((record) =>
    headers.map((header) => escapeCsvValue(record[header])).join(","),
  );

  return [headerRow, ...dataRows].join("\n");
}

function downloadCsv(fileName, content) {
  const blob = new Blob(["\uFEFF", content], {
    type: "text/csv;charset=utf-8",
  });

  const downloadUrl = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = downloadUrl;
  link.download = fileName;

  document.body.appendChild(link);

  link.click();
  link.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);
}

function getStatusLabel(status) {
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

function getImpactLabel(impactCategory) {
  switch (impactCategory) {
    case "high":
      return "High Impact";

    case "low":
      return "Low Impact";

    default:
      return "Medium Impact";
  }
}

function getTaskScope(phase) {
  return phase === "Pre-Arrival"
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
  const exportedAt = new Date().toISOString();

  const flightKey =
    normalizeText(flight.flightOut).replace(/[^A-Z0-9_-]/gi, "-") ||
    "Current-Flight";

  const dateKey = normalizeText(flight.flightDate) || "No-Date";

  const taskRecords = checklistItems.map((item, index) => {
    const row = rows[index] || {};

    const delaySeconds =
      row.delaySeconds === null || row.delaySeconds === undefined
        ? null
        : row.delaySeconds;

    const delayMinutes = delaySeconds === null ? null : delaySeconds / 60;

    return {
      checklist_id: checklistId || "",
      flight_date: normalizeText(flight.flightDate),
      flight_in: normalizeText(flight.flightIn),
      flight_out: normalizeText(flight.flightOut),
      aircraft_type: normalizeText(flight.aircraftType),
      registration: normalizeText(flight.registration),
      bay: normalizeText(flight.bay),
      task_code: item.taskCode,
      task_number: item.itemNumber,
      phase: item.phase,
      reporting_scope: getTaskScope(item.phase),
      pre_arrival_baseline: item.phase === "Pre-Arrival" ? "STA" : "",
      activity: item.activity,
      timing_base: item.base,
      planned_offset_seconds: item.offsetSec,
      planned_time: normalizeTime(plannedTimeFor(index)),
      actual_time: normalizeTime(row.actualTime),
      delay_seconds: delaySeconds ?? "",
      delay_minutes: delayMinutes ?? "",
      timing_status: getStatusLabel(row.status),
      is_completed: row.status !== "pending" ? "Yes" : "No",
      impact_category: getImpactLabel(item.impactCategory),
      observation: normalizeText(row.observation),
      started_at: row.startedAt || "",
      started_by: row.startedBy || "",
      exported_at: exportedAt,
    };
  });

  const turnaroundRecords = [
    {
      checklist_id: checklistId || "",
      flight_date: normalizeText(flight.flightDate),
      flight_in: normalizeText(flight.flightIn),
      flight_out: normalizeText(flight.flightOut),
      bay: normalizeText(flight.bay),
      aircraft_type: normalizeText(flight.aircraftType),
      registration: normalizeText(flight.registration),
      sta: normalizeTime(flight.sta),
      eta: normalizeTime(flight.eta),
      ata: normalizeTime(flight.ata),
      chocks_on: normalizeTime(flight.chocksOn),
      std: normalizeTime(flight.std),
      defined_push_time: normalizeTime(flight.definedPushTime || flight.std),
      coordinator: normalizeText(flight.trcCoordinator),
      checklist_total: metrics.total,
      checklist_completed: metrics.done,
      checklist_pending: metrics.pending,
      checklist_completion_percentage: calculatePercentage(
        metrics.done,
        metrics.total,
      ),
      operational_total: operationalMetrics.total,
      operational_completed: operationalMetrics.done,
      operational_pending: operationalMetrics.pending,
      operational_completion_percentage: calculatePercentage(
        operationalMetrics.done,
        operationalMetrics.total,
      ),
      operational_on_time: operationalMetrics.ontime,
      operational_light_delay: operationalMetrics.light,
      operational_delay: operationalMetrics.delay,
      operational_high_impact_exceptions: operationalMetrics.highImpactDelay,
      pre_arrival_total: preArrivalMetrics.total,
      pre_arrival_completed: preArrivalMetrics.done,
      pre_arrival_pending: preArrivalMetrics.pending,
      pre_arrival_completion_percentage: calculatePercentage(
        preArrivalMetrics.done,
        preArrivalMetrics.total,
      ),
      pre_arrival_on_time: preArrivalMetrics.ontime,
      pre_arrival_light_delay: preArrivalMetrics.light,
      pre_arrival_delay: preArrivalMetrics.delay,
      pre_arrival_high_impact_exceptions: preArrivalMetrics.highImpactDelay,
      exported_at: exportedAt,
    },
  ];

  const taskDimensionRecords = checklistItems.map((item) => ({
    task_code: item.taskCode,
    task_number: item.itemNumber,
    phase: item.phase,
    reporting_scope: getTaskScope(item.phase),
    pre_arrival_baseline: item.phase === "Pre-Arrival" ? "STA" : "",
    activity: item.activity,
    timing_base: item.base,
    planned_offset_seconds: item.offsetSec,
    impact_category: getImpactLabel(item.impactCategory),
  }));

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
    "pre_arrival_baseline",
    "activity",
    "timing_base",
    "planned_offset_seconds",
    "planned_time",
    "actual_time",
    "delay_seconds",
    "delay_minutes",
    "timing_status",
    "is_completed",
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
    "checklist_completion_percentage",
    "operational_total",
    "operational_completed",
    "operational_pending",
    "operational_completion_percentage",
    "operational_on_time",
    "operational_light_delay",
    "operational_delay",
    "operational_high_impact_exceptions",
    "pre_arrival_total",
    "pre_arrival_completed",
    "pre_arrival_pending",
    "pre_arrival_completion_percentage",
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
    "pre_arrival_baseline",
    "activity",
    "timing_base",
    "planned_offset_seconds",
    "impact_category",
  ];

  downloadCsv(
    `PTS_FactTaskPerformance_${dateKey}_${flightKey}.csv`,
    createCsv(taskHeaders, taskRecords),
  );

  window.setTimeout(() => {
    downloadCsv(
      `PTS_FactTurnaround_${dateKey}_${flightKey}.csv`,
      createCsv(turnaroundHeaders, turnaroundRecords),
    );
  }, 250);

  window.setTimeout(() => {
    downloadCsv(
      `PTS_DimTask_${dateKey}_${flightKey}.csv`,
      createCsv(taskDimensionHeaders, taskDimensionRecords),
    );
  }, 500);
}
