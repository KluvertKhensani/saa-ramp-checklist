const STATUS_KEYS = {
  pending: "pending",
  on_time: "ontime",
  ontime: "ontime",
  light_delay: "light",
  light: "light",
  delay: "delay",
};

function numberOrZero(value) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) ? numericValue : 0;
}

function normalizeText(value) {
  return String(value ?? "").trim();
}

function normalizeLowerText(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeBoolean(value) {
  return value === true || value === "true" || value === 1;
}

function normalizeStatus(value) {
  return STATUS_KEYS[value] || "pending";
}

function normalizeDate(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 10);
}

function normalizeTime(value) {
  if (!value) {
    return "";
  }

  return String(value).slice(0, 5);
}

function roundTo(value, decimalPlaces = 1) {
  const multiplier = 10 ** decimalPlaces;

  return Math.round(value * multiplier) / multiplier;
}

function percentage(numerator, denominator) {
  if (!denominator) {
    return 0;
  }

  return roundTo((numerator / denominator) * 100, 1);
}

function getReportingScope(phase) {
  return phase === "Pre-Arrival"
    ? "Pre-Arrival Readiness"
    : "Turnaround Operation";
}

function getChecklistTasks(tasks, checklistId) {
  return tasks.filter((task) => task.checklistId === checklistId);
}

function getCompletedTasks(tasks) {
  return tasks.filter((task) => task.isCompleted);
}

function getCompletedOperationalTasks(tasks) {
  return tasks.filter(
    (task) =>
      task.isCompleted &&
      task.reportingScope === "Turnaround Operation",
  );
}

function getPositiveDelayedTasks(tasks) {
  return tasks.filter(
    (task) => task.isCompleted && task.delaySeconds > 0,
  );
}

function average(values) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function compareDateAscending(firstRecord, secondRecord) {
  return firstRecord.flightDate.localeCompare(secondRecord.flightDate);
}

function compareCountDescending(firstRecord, secondRecord) {
  return secondRecord.count - firstRecord.count;
}

function matchesTextFilter(value, filterValue) {
  if (!filterValue) {
    return true;
  }

  return normalizeLowerText(value).includes(
    normalizeLowerText(filterValue),
  );
}

export function createDefaultReportingFilters(referenceDate = new Date()) {
  const dateTo = new Date(referenceDate);
  const dateFrom = new Date(referenceDate);

  dateFrom.setDate(dateFrom.getDate() - 29);

  return {
    dateFrom: dateFrom.toISOString().slice(0, 10),
    dateTo: dateTo.toISOString().slice(0, 10),
    flightOut: "",
    registration: "",
    aircraftType: "all",
    checklistStatus: "completed",
    phase: "all",
    impactCategory: "all",
  };
}

export function normalizeChecklistRecord(record = {}) {
  return {
    checklistId: record.id || record.checklist_id || "",
    flightIn: normalizeText(record.flight_in),
    flightOut: normalizeText(record.flight_out),
    flightDate: normalizeDate(record.flight_date),
    bay: normalizeText(record.bay),
    aircraftType: normalizeText(record.aircraft_type),
    registration: normalizeText(record.registration),
    sta: normalizeTime(record.sta),
    eta: normalizeTime(record.eta),
    ata: normalizeTime(record.ata),
    chocksOn: normalizeTime(record.chocks_on),
    scheduledDeparture: normalizeTime(record.std),
    definedPushTime: normalizeTime(record.defined_push_time),
    coordinator: normalizeText(record.trc_coordinator),
    checklistStatus: normalizeText(record.checklist_status) || "in_progress",
    isLocked: normalizeBoolean(record.is_locked),
    createdAt: record.created_at || "",
    updatedAt: record.updated_at || "",
  };
}

export function normalizeTaskRecord(record = {}) {
  const phase = normalizeText(record.phase);
  const status = normalizeStatus(record.operational_status);
  const completedAt = record.completed_at || "";

  return {
    taskId: record.id || "",
    checklistId: record.checklist_id || "",
    taskCode: normalizeText(record.task_code),
    taskNumber: numberOrZero(record.item_number),
    phase,
    reportingScope: getReportingScope(phase),
    preArrivalBaseline: phase === "Pre-Arrival",
    activity: normalizeText(record.activity),
    impactCategory: normalizeText(record.impact_category) || "medium",
    timingBase: normalizeText(record.base_time),
    plannedOffsetSeconds: numberOrZero(record.planned_offset_seconds),
    plannedTime: normalizeTime(record.planned_time),
    actualTime: normalizeTime(record.actual_time),
    delaySeconds: numberOrZero(record.delay_seconds),
    delayMinutes: roundTo(numberOrZero(record.delay_seconds) / 60, 1),
    timingStatus: status,
    isCompleted: Boolean(completedAt) || status !== "pending",
    observation: normalizeText(record.observation),
    startedAt: record.started_at || "",
    completedAt,
    startedBy: record.started_by || "",
    completedBy: record.completed_by || "",
  };
}

export function normalizeReportingData({
  checklists = [],
  tasks = [],
} = {}) {
  return {
    checklists: checklists.map(normalizeChecklistRecord),
    tasks: tasks.map(normalizeTaskRecord),
  };
}

export function filterReportingData({
  checklists = [],
  tasks = [],
  filters,
}) {
  const effectiveFilters =
    filters || createDefaultReportingFilters();

  const filteredChecklists = checklists.filter((checklist) => {
    const dateMatches =
      (!effectiveFilters.dateFrom ||
        checklist.flightDate >= effectiveFilters.dateFrom) &&
      (!effectiveFilters.dateTo ||
        checklist.flightDate <= effectiveFilters.dateTo);

    const flightMatches = matchesTextFilter(
      checklist.flightOut,
      effectiveFilters.flightOut,
    );

    const registrationMatches = matchesTextFilter(
      checklist.registration,
      effectiveFilters.registration,
    );

    const aircraftMatches =
      effectiveFilters.aircraftType === "all" ||
      checklist.aircraftType === effectiveFilters.aircraftType;

    const statusMatches =
      effectiveFilters.checklistStatus === "all" ||
      checklist.checklistStatus === effectiveFilters.checklistStatus;

    return (
      dateMatches &&
      flightMatches &&
      registrationMatches &&
      aircraftMatches &&
      statusMatches
    );
  });

  const checklistIds = new Set(
    filteredChecklists.map((checklist) => checklist.checklistId),
  );

  const filteredTasks = tasks.filter((task) => {
    if (!checklistIds.has(task.checklistId)) {
      return false;
    }

    const phaseMatches =
      effectiveFilters.phase === "all" ||
      task.phase === effectiveFilters.phase;

    const impactMatches =
      effectiveFilters.impactCategory === "all" ||
      task.impactCategory === effectiveFilters.impactCategory;

    return phaseMatches && impactMatches;
  });

  return {
    checklists: filteredChecklists,
    tasks: filteredTasks,
  };
}

export function calculateReportingKpis({
  checklists = [],
  tasks = [],
}) {
  const completedChecklists = checklists.filter(
    (checklist) => checklist.checklistStatus === "completed",
  );

  const completedTasks = getCompletedTasks(tasks);
  const operationalTasks = tasks.filter(
    (task) => task.reportingScope === "Turnaround Operation",
  );
  const completedOperationalTasks =
    getCompletedOperationalTasks(tasks);

  const onTimeTasks = completedOperationalTasks.filter(
    (task) => task.timingStatus === "ontime",
  );

  const lightDelayTasks = completedOperationalTasks.filter(
    (task) => task.timingStatus === "light",
  );

  const delayedTasks = completedOperationalTasks.filter(
    (task) => task.timingStatus === "delay",
  );

  const highImpactExceptions = completedOperationalTasks.filter(
    (task) =>
      task.impactCategory === "high" &&
      (task.timingStatus === "light" ||
        task.timingStatus === "delay"),
  );

  const positivelyDelayedTasks =
    getPositiveDelayedTasks(completedOperationalTasks);

  return {
    completedChecklists: completedChecklists.length,
    totalChecklists: checklists.length,
    completedTasks: completedTasks.length,
    totalTasks: tasks.length,
    averageCompletionPercentage: percentage(
      completedTasks.length,
      tasks.length,
    ),
    operationalOnTimePercentage: percentage(
      onTimeTasks.length,
      completedOperationalTasks.length,
    ),
    onTimeActivities: onTimeTasks.length,
    lightDelayActivities: lightDelayTasks.length,
    delayedActivities: delayedTasks.length,
    highImpactExceptions: highImpactExceptions.length,
    averageDelaySeconds: roundTo(
      average(
        positivelyDelayedTasks.map((task) => task.delaySeconds),
      ),
      0,
    ),
    averageDelayMinutes: roundTo(
      average(
        positivelyDelayedTasks.map((task) => task.delayMinutes),
      ),
      1,
    ),
    completedOperationalTasks: completedOperationalTasks.length,
    totalOperationalTasks: operationalTasks.length,
  };
}

export function aggregateChecklistVolume(checklists = []) {
  const recordsByDate = new Map();

  checklists.forEach((checklist) => {
    if (!checklist.flightDate) {
      return;
    }

    const currentRecord = recordsByDate.get(checklist.flightDate) || {
      date: checklist.flightDate,
      total: 0,
      completed: 0,
      inProgress: 0,
    };

    currentRecord.total += 1;

    if (checklist.checklistStatus === "completed") {
      currentRecord.completed += 1;
    } else {
      currentRecord.inProgress += 1;
    }

    recordsByDate.set(checklist.flightDate, currentRecord);
  });

  return [...recordsByDate.values()].sort(
    (firstRecord, secondRecord) =>
      firstRecord.date.localeCompare(secondRecord.date),
  );
}

export function aggregateOperationalStatus(tasks = []) {
  const operationalTasks = getCompletedOperationalTasks(tasks);

  const statusTotals = {
    ontime: 0,
    light: 0,
    delay: 0,
  };

  operationalTasks.forEach((task) => {
    if (Object.hasOwn(statusTotals, task.timingStatus)) {
      statusTotals[task.timingStatus] += 1;
    }
  });

  return [
    {
      name: "On Time",
      value: statusTotals.ontime,
      status: "ontime",
    },
    {
      name: "Slightly Delayed",
      value: statusTotals.light,
      status: "light",
    },
    {
      name: "Delayed",
      value: statusTotals.delay,
      status: "delay",
    },
  ];
}

export function aggregatePhasePerformance(tasks = []) {
  const recordsByPhase = new Map();

  getCompletedTasks(tasks).forEach((task) => {
    const currentRecord = recordsByPhase.get(task.phase) || {
      phase: task.phase || "Unspecified",
      onTime: 0,
      lightDelay: 0,
      delayed: 0,
      total: 0,
    };

    currentRecord.total += 1;

    if (task.timingStatus === "ontime") {
      currentRecord.onTime += 1;
    }

    if (task.timingStatus === "light") {
      currentRecord.lightDelay += 1;
    }

    if (task.timingStatus === "delay") {
      currentRecord.delayed += 1;
    }

    recordsByPhase.set(currentRecord.phase, currentRecord);
  });

  return [...recordsByPhase.values()];
}

export function aggregateMostDelayedTasks(tasks = [], limit = 10) {
  const activityGroups = new Map();

  getPositiveDelayedTasks(tasks).forEach((task) => {
    const groupKey = task.taskCode || task.activity;

    const currentGroup = activityGroups.get(groupKey) || {
      taskCode: task.taskCode,
      activity: task.activity || "Unspecified activity",
      totalDelaySeconds: 0,
      delayedCount: 0,
    };

    currentGroup.totalDelaySeconds += task.delaySeconds;
    currentGroup.delayedCount += 1;

    activityGroups.set(groupKey, currentGroup);
  });

  return [...activityGroups.values()]
    .map((group) => ({
      taskCode: group.taskCode,
      activity: group.activity,
      delayedCount: group.delayedCount,
      averageDelaySeconds: roundTo(
        group.totalDelaySeconds / group.delayedCount,
        0,
      ),
      averageDelayMinutes: roundTo(
        group.totalDelaySeconds / group.delayedCount / 60,
        1,
      ),
    }))
    .sort(
      (firstGroup, secondGroup) =>
        secondGroup.averageDelaySeconds -
        firstGroup.averageDelaySeconds,
    )
    .slice(0, limit);
}

export function aggregateHighImpactExceptions(
  tasks = [],
  limit = 10,
) {
  const exceptionGroups = new Map();

  getCompletedOperationalTasks(tasks)
    .filter(
      (task) =>
        task.impactCategory === "high" &&
        (task.timingStatus === "light" ||
          task.timingStatus === "delay"),
    )
    .forEach((task) => {
      const groupKey = task.taskCode || task.activity;

      const currentGroup = exceptionGroups.get(groupKey) || {
        taskCode: task.taskCode,
        activity: task.activity || "Unspecified activity",
        count: 0,
      };

      currentGroup.count += 1;

      exceptionGroups.set(groupKey, currentGroup);
    });

  return [...exceptionGroups.values()]
    .sort(compareCountDescending)
    .slice(0, limit);
}

export function aggregateAircraftPerformance({
  checklists = [],
  tasks = [],
}) {
  const checklistMap = new Map(
    checklists.map((checklist) => [
      checklist.checklistId,
      checklist,
    ]),
  );

  const aircraftGroups = new Map();

  getCompletedOperationalTasks(tasks).forEach((task) => {
    const checklist = checklistMap.get(task.checklistId);

    if (!checklist) {
      return;
    }

    const registration = checklist.registration || "Unspecified";

    const currentGroup = aircraftGroups.get(registration) || {
      registration,
      completedTasks: 0,
      onTimeTasks: 0,
      lightDelayTasks: 0,
      delayedTasks: 0,
    };

    currentGroup.completedTasks += 1;

    if (task.timingStatus === "ontime") {
      currentGroup.onTimeTasks += 1;
    }

    if (task.timingStatus === "light") {
      currentGroup.lightDelayTasks += 1;
    }

    if (task.timingStatus === "delay") {
      currentGroup.delayedTasks += 1;
    }

    aircraftGroups.set(registration, currentGroup);
  });

  return [...aircraftGroups.values()]
    .map((group) => ({
      ...group,
      onTimePercentage: percentage(
        group.onTimeTasks,
        group.completedTasks,
      ),
    }))
    .sort(
      (firstGroup, secondGroup) =>
        secondGroup.completedTasks - firstGroup.completedTasks,
    );
}

export function buildManagementMatrix({
  checklists = [],
  tasks = [],
}) {
  return checklists
    .map((checklist) => {
      const checklistTasks = getChecklistTasks(
        tasks,
        checklist.checklistId,
      );

      const completedTasks = getCompletedTasks(checklistTasks);
      const operationalTasks =
        getCompletedOperationalTasks(checklistTasks);

      const onTimeTasks = operationalTasks.filter(
        (task) => task.timingStatus === "ontime",
      );

      const lightDelayTasks = operationalTasks.filter(
        (task) => task.timingStatus === "light",
      );

      const delayedTasks = operationalTasks.filter(
        (task) => task.timingStatus === "delay",
      );

      const highImpactExceptions = operationalTasks.filter(
        (task) =>
          task.impactCategory === "high" &&
          (task.timingStatus === "light" ||
            task.timingStatus === "delay"),
      );

      const positiveDelayTasks =
        getPositiveDelayedTasks(operationalTasks);

      return {
        checklistId: checklist.checklistId,
        flightDate: checklist.flightDate,
        flightOut: checklist.flightOut,
        registration: checklist.registration,
        aircraftType: checklist.aircraftType,
        checklistStatus: checklist.checklistStatus,
        totalTasks: checklistTasks.length,
        completedTasks: completedTasks.length,
        completionPercentage: percentage(
          completedTasks.length,
          checklistTasks.length,
        ),
        operationalTasks: operationalTasks.length,
        onTime: onTimeTasks.length,
        lightDelay: lightDelayTasks.length,
        delayed: delayedTasks.length,
        highImpactExceptions: highImpactExceptions.length,
        averageDelayMinutes: roundTo(
          average(
            positiveDelayTasks.map((task) => task.delayMinutes),
          ),
          1,
        ),
      };
    })
    .sort(compareDateAscending)
    .reverse();
}

export function buildReportingAnalytics({
  checklists = [],
  tasks = [],
  filters,
}) {
  const filteredData = filterReportingData({
    checklists,
    tasks,
    filters,
  });

  return {
    filteredChecklists: filteredData.checklists,
    filteredTasks: filteredData.tasks,
    kpis: calculateReportingKpis(filteredData),
    checklistVolume: aggregateChecklistVolume(
      filteredData.checklists,
    ),
    operationalStatus: aggregateOperationalStatus(
      filteredData.tasks,
    ),
    phasePerformance: aggregatePhasePerformance(
      filteredData.tasks,
    ),
    mostDelayedTasks: aggregateMostDelayedTasks(
      filteredData.tasks,
    ),
    highImpactExceptions: aggregateHighImpactExceptions(
      filteredData.tasks,
    ),
    aircraftPerformance: aggregateAircraftPerformance(
      filteredData,
    ),
    managementMatrix: buildManagementMatrix(filteredData),
  };
}