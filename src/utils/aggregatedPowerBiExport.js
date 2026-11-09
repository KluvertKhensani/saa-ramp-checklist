const CSV_SEPARATOR = ",";

function csvValue(value) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (
    text.includes(CSV_SEPARATOR) ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

function createCsv(records) {
  if (!Array.isArray(records) || records.length === 0) {
    return "";
  }

  const headers = Object.keys(records[0]);

  const lines = [
    headers.map(csvValue).join(CSV_SEPARATOR),
    ...records.map((record) =>
      headers
        .map((header) => csvValue(record[header]))
        .join(CSV_SEPARATOR),
    ),
  ];

  return `\uFEFF${lines.join("\r\n")}`;
}

function downloadCsv(records, filename) {
  const csv = createCsv(records);

  if (!csv) {
    return false;
  }

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8",
  });

  const downloadUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = downloadUrl;
  anchor.download = filename;
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(downloadUrl);
  }, 1000);

  return true;
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function formatStatus(value) {
  switch (value) {
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

function delayMinutes(value) {
  const seconds = Number(value);

  if (!Number.isFinite(seconds)) {
    return "";
  }

  return Number((seconds / 60).toFixed(2));
}

function percentage(value, total) {
  if (!total) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
}

function isCompleted(item) {
  return Boolean(
    item?.operational_status &&
      item.operational_status !== "pending",
  );
}

function createFlightRecords(checklists, itemsByChecklist) {
  return checklists.map((checklist) => {
    const items = itemsByChecklist.get(checklist.id) || [];

    const preArrivalItems = items.filter(
      (item) => item.phase === "Pre-Arrival",
    );

    const operationalItems = items.filter(
      (item) => item.phase !== "Pre-Arrival",
    );

    const completedItems = items.filter(isCompleted);

    const completedOperationalItems =
      operationalItems.filter(isCompleted);

    const onTimeOperationalItems = operationalItems.filter(
      (item) => item.operational_status === "on_time",
    );

    const lightDelayOperationalItems = operationalItems.filter(
      (item) => item.operational_status === "light_delay",
    );

    const delayedOperationalItems = operationalItems.filter(
      (item) => item.operational_status === "delay",
    );

    const highImpactExceptions = operationalItems.filter(
      (item) =>
        item.impact_category === "high" &&
        ["light_delay", "delay"].includes(
          item.operational_status,
        ),
    );

    return {
      checklist_id: checklist.id,
      flight_date: checklist.flight_date || "",
      flight_in: checklist.flight_in || "",
      flight_out: checklist.flight_out || "",
      bay: checklist.bay || "",
      aircraft_type: checklist.aircraft_type || "",
      registration: checklist.registration || "",
      sta: formatTime(checklist.sta),
      eta: formatTime(checklist.eta),
      ata: formatTime(checklist.ata),
      chocks_on: formatTime(checklist.chocks_on),
      std: formatTime(checklist.std),
      defined_push_time: formatTime(
        checklist.defined_push_time || checklist.std,
      ),
      coordinator: checklist.trc_coordinator || "",
      checklist_status: checklist.checklist_status || "",
      checklist_locked: checklist.is_locked ? "Yes" : "No",
      total_activities: items.length,
      completed_activities: completedItems.length,
      pending_activities: items.length - completedItems.length,
      checklist_completion_percentage: percentage(
        completedItems.length,
        items.length,
      ),
      pre_arrival_total: preArrivalItems.length,
      pre_arrival_completed:
        preArrivalItems.filter(isCompleted).length,
      operational_total: operationalItems.length,
      operational_completed: completedOperationalItems.length,
      operational_pending:
        operationalItems.length -
        completedOperationalItems.length,
      operational_on_time: onTimeOperationalItems.length,
      operational_slight_delay:
        lightDelayOperationalItems.length,
      operational_delay: delayedOperationalItems.length,
      operational_on_time_percentage: percentage(
        onTimeOperationalItems.length,
        completedOperationalItems.length,
      ),
      high_impact_exceptions: highImpactExceptions.length,
      approved_by: checklist.approved_by || "",
      approved_at: checklist.approved_at || "",
      updated_at: checklist.updated_at || "",
    };
  });
}

function createActivityRecords(checklists, itemsByChecklist) {
  const records = [];

  for (const checklist of checklists) {
    const items = itemsByChecklist.get(checklist.id) || [];

    for (const item of items) {
      records.push({
        checklist_id: checklist.id,
        flight_date: checklist.flight_date || "",
        flight_in: checklist.flight_in || "",
        flight_out: checklist.flight_out || "",
        aircraft_type: checklist.aircraft_type || "",
        registration: checklist.registration || "",
        task_code: item.task_code || "",
        item_number: item.item_number ?? "",
        reporting_scope:
          item.phase === "Pre-Arrival"
            ? "Pre-Arrival Readiness"
            : "Turnaround Operations",
        phase: item.phase || "",
        activity: item.activity || "",
        impact_category: item.impact_category || "",
        timing_base: item.base_time || "",
        planned_offset_seconds:
          item.planned_offset_seconds ?? "",
        planned_time: formatTime(item.planned_time),
        actual_time: formatTime(item.actual_time),
        delay_seconds: item.delay_seconds ?? "",
        delay_minutes: delayMinutes(item.delay_seconds),
        operational_status:
          item.operational_status || "pending",
        operational_status_label: formatStatus(
          item.operational_status,
        ),
        observation: item.observation || "",
        started_at: item.started_at || "",
        started_by: item.started_by || "",
        completed_at: item.completed_at || "",
        completed_by: item.completed_by || "",
      });
    }
  }

  return records;
}

function createDailyRecords(flightRecords) {
  const recordsByDate = new Map();

  for (const flight of flightRecords) {
    const date = flight.flight_date || "Unknown";

    if (!recordsByDate.has(date)) {
      recordsByDate.set(date, {
        flight_date: date,
        total_flights: 0,
        completed_flights: 0,
        operational_activities: 0,
        operational_completed: 0,
        operational_on_time: 0,
        operational_slight_delay: 0,
        operational_delay: 0,
        high_impact_exceptions: 0,
      });
    }

    const dailyRecord = recordsByDate.get(date);

    dailyRecord.total_flights += 1;

    if (flight.checklist_status === "completed") {
      dailyRecord.completed_flights += 1;
    }

    dailyRecord.operational_activities +=
      flight.operational_total;

    dailyRecord.operational_completed +=
      flight.operational_completed;

    dailyRecord.operational_on_time +=
      flight.operational_on_time;

    dailyRecord.operational_slight_delay +=
      flight.operational_slight_delay;

    dailyRecord.operational_delay +=
      flight.operational_delay;

    dailyRecord.high_impact_exceptions +=
      flight.high_impact_exceptions;
  }

  return [...recordsByDate.values()]
    .sort((first, second) =>
      first.flight_date.localeCompare(second.flight_date),
    )
    .map((record) => ({
      ...record,
      flight_completion_percentage: percentage(
        record.completed_flights,
        record.total_flights,
      ),
      operational_completion_percentage: percentage(
        record.operational_completed,
        record.operational_activities,
      ),
      operational_on_time_percentage: percentage(
        record.operational_on_time,
        record.operational_completed,
      ),
    }));
}

function createDelayAnalysisRecords(activityRecords) {
  const activityMap = new Map();

  for (const activity of activityRecords) {
    const key =
      activity.task_code ||
      `${activity.phase}:${activity.activity}`;

    if (!activityMap.has(key)) {
      activityMap.set(key, {
        task_code: activity.task_code,
        phase: activity.phase,
        activity: activity.activity,
        impact_category: activity.impact_category,
        completed_occurrences: 0,
        on_time_occurrences: 0,
        slight_delay_occurrences: 0,
        delayed_occurrences: 0,
        total_positive_delay_minutes: 0,
        maximum_delay_minutes: 0,
      });
    }

    const record = activityMap.get(key);

    if (
      activity.operational_status &&
      activity.operational_status !== "pending"
    ) {
      record.completed_occurrences += 1;
    }

    if (activity.operational_status === "on_time") {
      record.on_time_occurrences += 1;
    }

    if (activity.operational_status === "light_delay") {
      record.slight_delay_occurrences += 1;
    }

    if (activity.operational_status === "delay") {
      record.delayed_occurrences += 1;
    }

    const minutes = Number(activity.delay_minutes);

    if (Number.isFinite(minutes) && minutes > 0) {
      record.total_positive_delay_minutes += minutes;
      record.maximum_delay_minutes = Math.max(
        record.maximum_delay_minutes,
        minutes,
      );
    }
  }

  return [...activityMap.values()]
    .map((record) => {
      const delayedOccurrences =
        record.slight_delay_occurrences +
        record.delayed_occurrences;

      return {
        task_code: record.task_code,
        phase: record.phase,
        activity: record.activity,
        impact_category: record.impact_category,
        completed_occurrences: record.completed_occurrences,
        on_time_occurrences: record.on_time_occurrences,
        slight_delay_occurrences:
          record.slight_delay_occurrences,
        delayed_occurrences: record.delayed_occurrences,
        total_delay_occurrences: delayedOccurrences,
        on_time_percentage: percentage(
          record.on_time_occurrences,
          record.completed_occurrences,
        ),
        average_positive_delay_minutes:
          delayedOccurrences > 0
            ? Number(
                (
                  record.total_positive_delay_minutes /
                  delayedOccurrences
                ).toFixed(2),
              )
            : 0,
        maximum_delay_minutes: Number(
          record.maximum_delay_minutes.toFixed(2),
        ),
      };
    })
    .sort(
      (first, second) =>
        second.total_delay_occurrences -
        first.total_delay_occurrences,
    );
}

export function buildAggregatedPowerBiData({
  checklists = [],
  checklistItems = [],
}) {
  const itemsByChecklist = new Map();

  for (const item of checklistItems) {
    if (!itemsByChecklist.has(item.checklist_id)) {
      itemsByChecklist.set(item.checklist_id, []);
    }

    itemsByChecklist.get(item.checklist_id).push(item);
  }

  const flights = createFlightRecords(
    checklists,
    itemsByChecklist,
  );

  const activities = createActivityRecords(
    checklists,
    itemsByChecklist,
  );

  const dailyPerformance = createDailyRecords(flights);

  const delayAnalysis =
    createDelayAnalysisRecords(activities);

  return {
    flights,
    activities,
    dailyPerformance,
    delayAnalysis,
  };
}

export function exportAggregatedPowerBiData({
  checklists = [],
  checklistItems = [],
  fromDate,
  toDate,
}) {
  if (!Array.isArray(checklists) || checklists.length === 0) {
    throw new Error(
      "No checklist records are available for export.",
    );
  }

  const reportingData = buildAggregatedPowerBiData({
    checklists,
    checklistItems,
  });

  const dateRange =
    fromDate && toDate
      ? `${fromDate}-to-${toDate}`
      : new Date().toISOString().slice(0, 10);

  const downloads = [
    downloadCsv(
      reportingData.flights,
      `SAA-GRU-Management-Flights-${dateRange}.csv`,
    ),
    downloadCsv(
      reportingData.activities,
      `SAA-GRU-Management-Activities-${dateRange}.csv`,
    ),
    downloadCsv(
      reportingData.dailyPerformance,
      `SAA-GRU-Daily-Performance-${dateRange}.csv`,
    ),
    downloadCsv(
      reportingData.delayAnalysis,
      `SAA-GRU-Delay-Analysis-${dateRange}.csv`,
    ),
  ];

  return {
    ...reportingData,
    downloadedFiles: downloads.filter(Boolean).length,
  };
}