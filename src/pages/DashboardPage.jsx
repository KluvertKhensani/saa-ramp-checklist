import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowLeft, ClipboardCheck } from "lucide-react";

import AppLogo from "../components/AppLogo";
import LiveClock from "../components/LiveClock";
import ChecklistActivity from "../components/checklist/ChecklistActivity";
import ChecklistApproval from "../components/checklist/ChecklistApproval";
import ChecklistAuditHistory from "../components/checklist/ChecklistAuditHistory";
import ChecklistExport from "../components/checklist/ChecklistExport";
import ChecklistHistory from "../components/checklist/ChecklistHistory";
import ChecklistMetrics from "../components/checklist/ChecklistMetrics";
import ChecklistPerformanceSummary from "../components/checklist/ChecklistPerformanceSummary";
import ChecklistPrintReport from "../components/checklist/ChecklistPrintReport";
import FlightInformation from "../components/checklist/FlightInformation";
import PushbackCountdown from "../components/checklist/PushbackCountdown";
import { useAuth } from "../contexts/useAuth";
import {
  CHECKLIST_ITEMS,
  CHECKLIST_PHASES,
  createEmptyChecklistRows,
} from "../data/checklistItems";
import { supabase } from "../lib/supabase";
import {
  addSecondsToDateTime,
  alignDateTimeToReference,
  calculateDateTimeDelaySeconds,
  classifyDelay,
  combineDateAndTime,
  currentTime,
  formatDateTimeAsTime,
  getPendingTaskTiming,
  normalizeDatabaseTime,
  startOfMinute,
} from "../utils/checklistTime";

import { exportPowerBiData } from "../utils/powerBiExport";

import {
  getOfflineActionCount,
  queueOfflineAction,
} from "../utils/offlineQueue";

import {
  canCompletePendingTask,
  canCreateChecklist,
  canEditFlightInformation,
  canEditObservations,
  canExportReports,
  canOperateChecklist,
  canUndoCompletedTask,
  canViewAuditHistory,
  canViewOperationalHistory,
  getRoleLabel,
  isReadOnlyRole,
} from "../utils/roles";
import OperationsMenu, {
  OperationsMenuButton,
} from "../components/navigation/OperationsMenu";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FLIGHT = {
  flightIn: "",
  flightOut: "",
  flightDate: getTodayDate(),
  bay: "",
  aircraftType: "",
  registration: "",
  sta: "",
  eta: "",
  ata: "",
  chocksOn: "",
  std: "",
  definedPushTime: "",
  trcCoordinator: "",
};

const EMPTY_APPROVAL_DETAILS = {
  approvedBy: null,
  approvedByName: "",
  approvedAt: null,
  notes: "",
};

const DATABASE_STATUS = {
  pending: "pending",
  ontime: "on_time",
  light: "light_delay",
  delay: "delay",
};

const APPLICATION_STATUS = {
  pending: "pending",
  on_time: "ontime",
  light_delay: "light",
  delay: "delay",
};

const AUTOSAVE_DELAY_MS = 1500;

const CONNECTION_LABELS = {
  checking: "Checking service connection",
  online: "Online",
  offline: "Offline · local draft available",
  unreachable: "Database service unavailable",
  pending: "Local draft stored on this device",
};

function getConnectionLabel(connectionStatus, pendingCount = 0) {
  if (pendingCount > 0) {
    return `${pendingCount} local ${
      pendingCount === 1 ? "draft" : "drafts"
    } stored on this device`;
  }

  return CONNECTION_LABELS[connectionStatus] || "Connection status unavailable";
}

function createInitialFlight(coordinatorName = "") {
  return {
    ...EMPTY_FLIGHT,
    flightDate: getTodayDate(),
    trcCoordinator: coordinatorName,
  };
}

function isFlightInformationComplete(flight) {
  return Boolean(
    flight.flightOut?.trim() &&
    flight.flightDate &&
    flight.aircraftType &&
    flight.registration &&
    flight.sta &&
    flight.std,
  );
}

function compareTaskCandidates(firstCandidate, secondCandidate) {
  const firstStarted = Boolean(firstCandidate.row?.startedAt);

  const secondStarted = Boolean(secondCandidate.row?.startedAt);

  if (firstStarted !== secondStarted) {
    return firstStarted ? -1 : 1;
  }

  if (firstCandidate.timing.overdue !== secondCandidate.timing.overdue) {
    return firstCandidate.timing.overdue ? -1 : 1;
  }

  const firstRemaining = firstCandidate.timing.remainingSeconds;

  const secondRemaining = secondCandidate.timing.remainingSeconds;

  const firstDueNow = firstRemaining === 0;

  const secondDueNow = secondRemaining === 0;

  if (firstDueNow !== secondDueNow) {
    return firstDueNow ? -1 : 1;
  }

  const firstTime = firstCandidate.plannedDateTime?.getTime() ?? null;

  const secondTime = secondCandidate.plannedDateTime?.getTime() ?? null;

  if (firstTime === null && secondTime === null) {
    return firstCandidate.item.itemNumber - secondCandidate.item.itemNumber;
  }

  if (firstTime === null) {
    return 1;
  }

  if (secondTime === null) {
    return -1;
  }

  if (firstTime === secondTime) {
    return firstCandidate.item.itemNumber - secondCandidate.item.itemNumber;
  }

  return firstTime - secondTime;
}

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();

  const [flight, setFlight] = useState(() =>
    createInitialFlight(profile?.full_name || ""),
  );

  const [rows, setRows] = useState(createEmptyChecklistRows);

  const [activePhase, setActivePhase] = useState("All");

  const [taskView, setTaskView] = useState("outstanding");

  const [checklistId, setChecklistId] = useState(null);

  const [saving, setSaving] = useState(false);

  const [loadingRecord, setLoadingRecord] = useState(false);

  const [statusMessage, setStatusMessage] = useState("Not saved");

  const [activeView, setActiveView] = useState("checklist");

  const [historyRecords, setHistoryRecords] = useState([]);

  const [historyLoading, setHistoryLoading] = useState(false);

  const [historySearch, setHistorySearch] = useState("");

  const [historyStatus, setHistoryStatus] = useState("all");

  const [recordLocked, setRecordLocked] = useState(false);

  const [approving, setApproving] = useState(false);

  const [approvalDetails, setApprovalDetails] = useState(
    EMPTY_APPROVAL_DETAILS,
  );

  const [auditRecords, setAuditRecords] = useState([]);

  const [auditLoading, setAuditLoading] = useState(false);

  const [operationalNow, setOperationalNow] = useState(() => new Date());

  const [focusedTaskNumber, setFocusedTaskNumber] = useState(null);

  const [processingTaskNumber, setProcessingTaskNumber] = useState(null);

  const [operationsMenuOpen, setOperationsMenuOpen] = useState(false);

  const [autosaveReady, setAutosaveReady] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState(
    navigator.onLine ? "checking" : "offline",
  );

  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const saveInProgressRef = useRef(false);

  const pendingSaveRef = useRef(false);

  const checklistIdRef = useRef(null);

  const initialLoadRef = useRef(true);

  const skipNextAutosaveRef = useRef(false);

  const plannedTimeForRef = useRef(null);

  const loadAuditHistoryRef = useRef(null);

  const queueChecklistSnapshotRef = useRef(null);

  const roleCanCreate = canCreateChecklist(profile?.role);

  const roleCanOperate = canOperateChecklist(profile?.role);

  const roleCanCompleteTask = canCompletePendingTask(profile?.role);

  const roleCanUndoTask = canUndoCompletedTask(profile?.role);

  const roleCanEditFlight = canEditFlightInformation(profile?.role);

  const roleCanEditObservation = canEditObservations(profile?.role);

  const roleCanViewHistory = canViewOperationalHistory(profile?.role);

  const roleCanViewAudit = canViewAuditHistory(profile?.role);

  const roleCanExport = canExportReports(profile?.role);

  const roleIsReadOnly = isReadOnlyRole(profile?.role);

  const checklistReadOnly =
    recordLocked || approving || roleIsReadOnly || !roleCanOperate;

  const flightInformationDisabled =
    recordLocked || approving || !roleCanEditFlight;

  const observationsDisabled =
    recordLocked || approving || !roleCanEditObservation;

  const taskCompletionDisabled =
    recordLocked || approving || !roleCanCompleteTask;

  const flightInformationComplete = isFlightInformationComplete(flight);

  const checklistActivitiesDisabled =
    taskCompletionDisabled || !flightInformationComplete;

  function isTaskProcessing(itemNumber) {
    return processingTaskNumber === itemNumber;
  }

  const refreshPendingSyncCount = useCallback(async () => {
    try {
      const actionCount = await getOfflineActionCount();

      setPendingSyncCount(actionCount);

      return actionCount;
    } catch (error) {
      console.error("Offline queue count failed:", error);

      return 0;
    }
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setOperationalNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function checkConnection() {
      if (!navigator.onLine) {
        if (active) {
          setConnectionStatus("offline");
        }

        return;
      }

      if (active) {
        setConnectionStatus("checking");
      }

      try {
        const { error } = await supabase.from("profiles").select("id").limit(1);

        if (!active) {
          return;
        }

        if (error) {
          setConnectionStatus("unreachable");

          return;
        }

        const actionCount = await refreshPendingSyncCount();

        if (!active) {
          return;
        }

        setConnectionStatus(actionCount > 0 ? "pending" : "online");
      } catch (error) {
        console.error("Connectivity check failed:", error);

        if (active) {
          setConnectionStatus("unreachable");
        }
      }
    }

    function handleOnline() {
      checkConnection();
    }

    function handleOffline() {
      setConnectionStatus("offline");
    }

    window.addEventListener("online", handleOnline);

    window.addEventListener("offline", handleOffline);

    checkConnection();

    const connectionTimer = window.setInterval(checkConnection, 60000);

    return () => {
      active = false;

      window.removeEventListener("online", handleOnline);

      window.removeEventListener("offline", handleOffline);

      window.clearInterval(connectionTimer);
    };
  }, [refreshPendingSyncCount]);

  useEffect(() => {
    checklistIdRef.current = checklistId;
  }, [checklistId]);

  useEffect(() => {
    const readyTimer = window.setTimeout(() => {
      initialLoadRef.current = false;

      setAutosaveReady(true);
    }, 500);

    return () => {
      window.clearTimeout(readyTimer);
    };
  }, []);

  function scheduledArrivalDateTime() {
    return combineDateAndTime(flight.flightDate, flight.sta);
  }

  function baseDateTimeForItem(item) {
    if (!item || !flight.flightDate) {
      return null;
    }

    const scheduledArrival = scheduledArrivalDateTime();

    if (item.phase === "Pre-Arrival") {
      return scheduledArrival;
    }

    switch (item.base) {
      case "sta":
        return scheduledArrival;

      case "chocks_on": {
        const chocksDateTime = combineDateAndTime(
          flight.flightDate,
          flight.chocksOn,
        );

        return alignDateTimeToReference(chocksDateTime, scheduledArrival);
      }

      case "std": {
        const stdDateTime = combineDateAndTime(flight.flightDate, flight.std);

        return alignDateTimeToReference(stdDateTime, scheduledArrival);
      }

      case "defined_push": {
        const pushTime = flight.definedPushTime || flight.std;

        const pushDateTime = combineDateAndTime(flight.flightDate, pushTime);

        const stdDateTime = alignDateTimeToReference(
          combineDateAndTime(flight.flightDate, flight.std),
          scheduledArrival,
        );

        return alignDateTimeToReference(
          pushDateTime,
          stdDateTime || scheduledArrival,
        );
      }

      default:
        console.warn(
          `Unknown timing base "${item.base}" for task ${
            item.taskCode || item.itemNumber || "unknown"
          }.`,
        );

        return null;
    }
  }

  function plannedDateTimeFor(index) {
    const item = CHECKLIST_ITEMS[index];

    if (!item) {
      return null;
    }

    const baseDateTime = baseDateTimeForItem(item);

    if (!baseDateTime) {
      return null;
    }

    return addSecondsToDateTime(baseDateTime, item.offsetSec);
  }

  function plannedTimeFor(index) {
    return formatDateTimeAsTime(plannedDateTimeFor(index));
  }

  plannedTimeForRef.current = plannedTimeFor;

  function requiredTimeLabelFor(item) {
    switch (item?.base) {
      case "sta":
        return "Flight Date and STA Scheduled";

      case "std":
        return "Flight Date and STD Scheduled";

      case "defined_push":
        return "Flight Date and Defined Push Time or STD Scheduled";

      case "chocks_on":
        return "Flight Date and Chocks On Real";

      default:
        return "the required operational time";
    }
  }

  const { metrics, operationalMetrics, preArrivalMetrics } = useMemo(() => {
    const createTotals = () => ({
      total: 0,
      pending: 0,
      done: 0,
      ontime: 0,
      light: 0,
      delay: 0,
      highImpactDelay: 0,
    });

    const allTotals = createTotals();

    const operationalTotals = createTotals();

    const preArrivalTotals = createTotals();

    CHECKLIST_ITEMS.forEach((item, index) => {
      const row = rows[index];

      if (!row) {
        return;
      }

      const targets = [
        allTotals,
        item.phase === "Pre-Arrival" ? preArrivalTotals : operationalTotals,
      ];

      targets.forEach((totals) => {
        totals.total += 1;

        if (row.status === "pending") {
          totals.pending += 1;
        } else {
          totals.done += 1;
        }

        if (row.status === "ontime") {
          totals.ontime += 1;
        }

        if (row.status === "light") {
          totals.light += 1;
        }

        if (row.status === "delay") {
          totals.delay += 1;
        }

        if (
          item.impactCategory === "high" &&
          (row.status === "light" || row.status === "delay")
        ) {
          totals.highImpactDelay += 1;
        }
      });
    });

    return {
      metrics: allTotals,
      operationalMetrics: operationalTotals,
      preArrivalMetrics: preArrivalTotals,
    };
  }, [rows]);

  const matchingItems = CHECKLIST_ITEMS.filter((item) => {
    const row = rows[item.itemNumber - 1];

    const belongsToPhase = activePhase === "All" || item.phase === activePhase;

    const matchesTaskView =
      taskView === "all" ||
      (taskView === "outstanding" && row?.status === "pending") ||
      (taskView === "completed" && row?.status !== "pending");

    return belongsToPhase && matchesTaskView;
  });

  function getIncompletePhaseCount(phase) {
    return CHECKLIST_ITEMS.reduce((count, item) => {
      const row = rows[item.itemNumber - 1];

      const belongsToPhase = phase === "All" || item.phase === phase;

      if (belongsToPhase && row?.status === "pending") {
        return count + 1;
      }

      return count;
    }, 0);
  }

  const visibleItems = [...matchingItems].sort((firstItem, secondItem) => {
    const firstIndex = firstItem.itemNumber - 1;

    const secondIndex = secondItem.itemNumber - 1;

    const firstTime = plannedDateTimeFor(firstIndex)?.getTime() ?? null;

    const secondTime = plannedDateTimeFor(secondIndex)?.getTime() ?? null;

    if (firstTime === null && secondTime === null) {
      return firstItem.itemNumber - secondItem.itemNumber;
    }

    if (firstTime === null) {
      return 1;
    }

    if (secondTime === null) {
      return -1;
    }

    if (firstTime === secondTime) {
      return firstItem.itemNumber - secondItem.itemNumber;
    }

    return firstTime - secondTime;
  });

  function updateFlight(field, value) {
    if (flightInformationDisabled) {
      return;
    }

    setFlight((currentFlight) => ({
      ...currentFlight,
      [field]: value,
    }));

    setFocusedTaskNumber(null);
    setStatusMessage("Not saved");
  }

  function updateRowState(itemNumber, changes) {
    const index = itemNumber - 1;

    setRows((currentRows) =>
      currentRows.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              ...changes,
            }
          : row,
      ),
    );
  }

  function updateObservation(itemNumber, value) {
    if (observationsDisabled) {
      return;
    }

    updateRowState(itemNumber, {
      observation: value,
    });

    setStatusMessage("Not saved");
  }

  async function startActivity(itemNumber) {
    if (processingTaskNumber !== null) {
      return;
    }

    if (taskCompletionDisabled) {
      window.alert(
        "Your role cannot start this task, or the checklist is locked.",
      );

      return;
    }

    if (connectionStatus !== "online") {
      window.alert(
        "This task cannot be started while the database service is unavailable.\n\n" +
          "Local draft storage protects entered information, but task lifecycle actions require an online database connection.",
      );

      return;
    }

    if (!flightInformationComplete) {
      window.alert(
        "Complete Flight Information before starting checklist activities.\n\n" +
          "Required fields:\n" +
          "- Flight Out\n" +
          "- Flight Date\n" +
          "- Aircraft Type\n" +
          "- Registration\n" +
          "- STA Scheduled\n" +
          "- STD Scheduled",
      );

      return;
    }

    if (!checklistId) {
      window.alert("Save the new checklist before starting tasks.");

      return;
    }

    if (!user?.id) {
      window.alert(
        "Your authenticated session could not be found. Please sign in again.",
      );

      return;
    }

    const index = itemNumber - 1;
    const row = rows[index];
    const item = CHECKLIST_ITEMS[index];

    if (!row || !item) {
      window.alert("The selected task could not be found.");

      return;
    }

    if (row.status !== "pending") {
      window.alert("This task is already completed.");

      return;
    }

    if (row.startedAt) {
      window.alert("This task has already been started.");

      return;
    }

    const plannedTime = plannedTimeFor(index);

    if (!plannedTime) {
      window.alert(
        `Record ${requiredTimeLabelFor(item)} before starting this task.`,
      );

      return;
    }

    try {
      setProcessingTaskNumber(itemNumber);
      setStatusMessage(`Starting: ${item.activity}`);

      const { data, error } = await supabase.rpc("start_ramp_task_once", {
        target_checklist_id: checklistId,
        target_task_code: item.taskCode,
      });

      if (error) {
        throw error;
      }

      const startedItem = Array.isArray(data) ? data[0] : data;

      if (!startedItem) {
        throw new Error("Supabase did not return the started task.");
      }

      if (!startedItem.started_at) {
        throw new Error("The task was not marked as started.");
      }

      skipNextAutosaveRef.current = true;

      updateRowState(itemNumber, {
        startedAt: startedItem.started_at,
        startedBy: startedItem.started_by || user.id,
      });

      setStatusMessage(`Started: ${item.activity}`);
    } catch (error) {
      console.error("Task start failed:", error);

      setStatusMessage("Task start failed");

      window.alert(
        "The task could not be started.\n\n" +
          (error?.message || "Unknown error"),
      );
    } finally {
      setProcessingTaskNumber(null);
    }
  }

  async function undoActivity(itemNumber) {
    if (processingTaskNumber !== null) {
      return;
    }

    if (recordLocked || approving) {
      window.alert("This checklist is locked or is currently being approved.");

      return;
    }

    if (!roleCanUndoTask) {
      window.alert("Your role cannot return a completed task to pending.");

      return;
    }

    if (connectionStatus !== "online") {
      window.alert(
        "A completed task cannot be returned to pending while the database service is unavailable.",
      );

      return;
    }

    if (!checklistId) {
      window.alert("Save the checklist before changing completed tasks.");

      return;
    }

    if (!user?.id) {
      window.alert(
        "Your authenticated session could not be found. Please sign in again.",
      );

      return;
    }

    const index = itemNumber - 1;
    const row = rows[index];
    const item = CHECKLIST_ITEMS[index];

    if (!row || !item) {
      window.alert("The selected task could not be found.");

      return;
    }

    if (row.status === "pending") {
      window.alert("This task is already pending.");

      return;
    }

    const confirmed = window.confirm(
      "Return this completed task to pending?\n\n" +
        `Task: ${item.activity}\n\n` +
        "The Start and Completion records will be cleared. " +
        "The task must then be started and completed again. " +
        "This action will be recorded in the audit history.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setProcessingTaskNumber(itemNumber);
      setStatusMessage(`Returning to pending: ${item.activity}`);

      const { data, error } = await supabase.rpc("undo_ramp_task_completion", {
        target_checklist_id: checklistId,
        target_task_code: item.taskCode,
      });

      if (error) {
        throw error;
      }

      const undoneItem = Array.isArray(data) ? data[0] : data;

      if (!undoneItem) {
        throw new Error("Supabase did not return the updated task.");
      }

      if (undoneItem.operational_status !== "pending") {
        throw new Error("The database did not return the task to pending.");
      }

      skipNextAutosaveRef.current = true;

      updateRowState(itemNumber, {
        actualTime: normalizeDatabaseTime(undoneItem.actual_time) || "",
        status: APPLICATION_STATUS[undoneItem.operational_status] || "pending",
        delaySeconds: undoneItem.delay_seconds ?? null,
        startedAt: undoneItem.started_at || null,
        startedBy: undoneItem.started_by || null,
      });

      setActiveView("checklist");
      setTaskView("outstanding");
      setActivePhase(item.phase);
      setFocusedTaskNumber(itemNumber);
      setStatusMessage(`Returned to pending: ${item.activity}`);

      if (roleCanViewAudit && loadAuditHistoryRef.current) {
        await loadAuditHistoryRef.current(checklistId);
      }

      window.setTimeout(() => {
        const taskElement = document.getElementById(
          `checklist-task-${itemNumber}`,
        );

        if (!taskElement) {
          return;
        }

        taskElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        taskElement.classList.add("task-focus-pulse");

        window.setTimeout(() => {
          taskElement.classList.remove("task-focus-pulse");
        }, 1800);
      }, 150);
    } catch (error) {
      console.error("Task undo failed:", error);

      setStatusMessage("Task undo failed");

      window.alert(
        "The completed task could not be returned to pending.\n\n" +
          (error?.message || "Unknown error"),
      );
    } finally {
      setProcessingTaskNumber(null);
    }
  }

  async function markActivity(itemNumber) {
    if (processingTaskNumber !== null) {
      return;
    }

    if (taskCompletionDisabled) {
      window.alert(
        "Your role cannot complete this task, or the checklist is locked.",
      );

      return;
    }

    if (connectionStatus !== "online") {
      window.alert(
        "This task cannot be completed while the database service is unavailable.\n\n" +
          "Local draft storage protects entered information, but task lifecycle actions require an online database connection.",
      );

      return;
    }

    if (!flightInformationComplete) {
      window.alert(
        "Complete Flight Information before completing checklist activities.",
      );

      return;
    }

    if (!checklistId) {
      window.alert("Save the checklist before completing tasks.");

      return;
    }

    if (!user?.id) {
      window.alert(
        "Your authenticated session could not be found. Please sign in again.",
      );

      return;
    }

    const index = itemNumber - 1;
    const row = rows[index];
    const item = CHECKLIST_ITEMS[index];

    if (!row || !item) {
      window.alert("The selected task could not be found.");

      return;
    }

    if (row.status !== "pending") {
      await undoActivity(itemNumber);

      return;
    }

    if (!row.startedAt) {
      window.alert("Start this task before completing it.");

      return;
    }

    const plannedDateTime = plannedDateTimeFor(index);
    const plannedTime = formatDateTimeAsTime(plannedDateTime);

    if (!plannedDateTime || !plannedTime) {
      window.alert(
        `Record ${requiredTimeLabelFor(item)} before completing this task.`,
      );

      return;
    }

    const actualTime = currentTime();
    const actualDateTime = startOfMinute(new Date());
    const normalizedPlannedDateTime = startOfMinute(plannedDateTime);

    const delaySeconds = calculateDateTimeDelaySeconds(
      actualDateTime,
      normalizedPlannedDateTime,
    );

    if (delaySeconds === null) {
      window.alert(
        "The task performance could not be calculated because its planned time is unavailable.",
      );

      return;
    }

    const completedStatus = classifyDelay(delaySeconds);
    const observationText = row.observation?.trim() || "";

    try {
      setProcessingTaskNumber(itemNumber);

      if (observationText) {
        const { error: observationSaveError } = await supabase
          .from("ramp_checklist_items")
          .update({
            observation: observationText,
            impact_category: item.impactCategory,
          })
          .eq("checklist_id", checklistId)
          .eq("task_code", item.taskCode);

        if (observationSaveError) {
          throw new Error(
            `The optional comment could not be saved. ${observationSaveError.message}`,
          );
        }
      }

      setStatusMessage(`Completing: ${item.activity}`);

      const { data, error } = await supabase.rpc("complete_ramp_task_once", {
        target_checklist_id: checklistId,
        target_task_code: item.taskCode,
        recorded_actual_time: actualTime,
        calculated_delay_seconds: delaySeconds,
        calculated_operational_status:
          DATABASE_STATUS[completedStatus] || "pending",
      });

      if (error) {
        throw error;
      }

      const updatedCompletion = Array.isArray(data) ? data[0] : data;

      if (!updatedCompletion) {
        throw new Error("Supabase did not return the completed task.");
      }

      const completedChanges = {
        actualTime:
          normalizeDatabaseTime(updatedCompletion.actual_time) || actualTime,
        delaySeconds: updatedCompletion.delay_seconds ?? delaySeconds,
        status:
          APPLICATION_STATUS[updatedCompletion.operational_status] ||
          completedStatus,
        startedAt: updatedCompletion.started_at || row.startedAt,
        startedBy: updatedCompletion.started_by || row.startedBy,
      };

      const updatedRows = rows.map((currentRow, rowIndex) =>
        rowIndex === index
          ? {
              ...currentRow,
              ...completedChanges,
            }
          : currentRow,
      );

      skipNextAutosaveRef.current = true;

      setRows(updatedRows);
      setFocusedTaskNumber(null);
      setStatusMessage(`Completed and saved: ${item.activity}`);

      window.setTimeout(() => {
        openNextPendingTask(updatedRows, itemNumber);
      }, 450);
    } catch (error) {
      console.error("Task completion failed:", error);

      setStatusMessage("Task completion failed");

      window.alert(
        "The task could not be completed.\n\n" +
          (error?.message || "Unknown error"),
      );
    } finally {
      setProcessingTaskNumber(null);
    }
  }

  function markLandingRealNow() {
    if (flightInformationDisabled) {
      window.alert(
        "This checklist is read-only for your current role or has already been locked.",
      );

      return;
    }

    updateFlight("ata", currentTime());
  }

  function markChocksOnNow() {
    if (flightInformationDisabled) {
      window.alert(
        "This checklist is read-only for your current role or has already been locked.",
      );

      return;
    }

    updateFlight("chocksOn", currentTime());
  }

  function getPendingCandidates(
    candidateRows = rows,
    excludedItemNumber = null,
  ) {
    return CHECKLIST_ITEMS.map((item, index) => {
      const row = candidateRows[index];

      const plannedDateTime = plannedDateTimeFor(index);

      const plannedTime = formatDateTimeAsTime(plannedDateTime);

      const timing = getPendingTaskTiming(
        plannedDateTime,
        operationalNow,
        `Awaiting ${requiredTimeLabelFor(item)}`,
      );

      return {
        item,
        row,
        plannedTime,
        plannedDateTime,
        timing,
      };
    })
      .filter(
        ({ item, row }) =>
          row?.status === "pending" && item.itemNumber !== excludedItemNumber,
      )
      .sort(compareTaskCandidates);
  }

  function focusPendingCandidate(candidate) {
    if (!candidate) {
      setFocusedTaskNumber(null);

      return;
    }

    const itemNumber = candidate.item.itemNumber;

    setActiveView("checklist");

    setTaskView("outstanding");

    setActivePhase(candidate.item.phase);

    setFocusedTaskNumber(itemNumber);

    setStatusMessage(
      candidate.row?.startedAt
        ? `Continue started task: ${candidate.item.activity}`
        : candidate.timing.overdue
          ? `Next overdue task: ${candidate.item.activity}`
          : `Next pending task: ${candidate.item.activity}`,
    );

    window.setTimeout(() => {
      const taskElement = document.getElementById(
        `checklist-task-${itemNumber}`,
      );

      if (!taskElement) {
        return;
      }

      taskElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      taskElement.classList.add("task-focus-pulse");

      window.setTimeout(() => {
        taskElement.classList.remove("task-focus-pulse");
      }, 1800);
    }, 220);
  }

  function openNextPendingTask(
    candidateRows = rows,
    excludedItemNumber = null,
  ) {
    const pendingCandidates = getPendingCandidates(
      candidateRows,
      excludedItemNumber,
    );

    if (pendingCandidates.length === 0) {
      setFocusedTaskNumber(null);

      setStatusMessage("All checklist activities are complete.");

      window.alert("All checklist activities are complete.");

      return;
    }

    focusPendingCandidate(pendingCandidates[0]);
  }

  function navigateToSection(sectionId) {
    if (sectionId === "performance-summary") {
      showPerformanceSummary();

      return;
    }

    setActiveView("checklist");

    window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function navigateToPhase(phase) {
    setActiveView("checklist");
    setTaskView("outstanding");
    setActivePhase(phase);
    setFocusedTaskNumber(null);

    window.setTimeout(() => {
      document.getElementById("checklist-tasks")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  function exportCurrentPowerBiData() {
    exportPowerBiData({
      checklistId,
      flight,
      rows,
      checklistItems: CHECKLIST_ITEMS,
      plannedTimeFor,
      metrics,
      operationalMetrics,
      preArrivalMetrics,
    });

    setStatusMessage("Power BI reporting data exported");
  }

  async function openExcelExport() {
    setActiveView("history");

    await loadChecklistHistory();

    window.setTimeout(() => {
      document.getElementById("excel-export")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 150);
  }

  async function handleSignOut() {
    const { error } = await signOut();

    if (error) {
      window.alert(`Sign out failed: ${error.message}`);
    }
  }

  function clearChecklistState(message) {
    setFlight(createInitialFlight(profile?.full_name || ""));

    setRows(createEmptyChecklistRows());

    setActivePhase("All");
    setTaskView("outstanding");
    setChecklistId(null);

    checklistIdRef.current = null;

    skipNextAutosaveRef.current = true;

    setRecordLocked(false);
    setFocusedTaskNumber(null);

    setApprovalDetails({
      ...EMPTY_APPROVAL_DETAILS,
    });

    setAuditRecords([]);
    setStatusMessage(message);
    setActiveView("checklist");

    localStorage.removeItem("saa_ramp_checklist_draft");
  }

  function resetChecklist() {
    if (checklistReadOnly) {
      window.alert("This checklist is read-only and cannot be reset.");

      return;
    }

    const confirmed = window.confirm(
      "Reset the current checklist and clear all entered data?",
    );

    if (!confirmed) {
      return;
    }

    clearChecklistState("Not saved");
  }

  async function loadChecklistHistory() {
    try {
      if (!user?.id) {
        throw new Error("Please sign in again.");
      }

      setHistoryLoading(true);

      setStatusMessage("Loading checklist history...");

      let query = supabase
        .from("ramp_checklists")
        .select(
          [
            "id",
            "flight_in",
            "flight_out",
            "flight_date",
            "bay",
            "aircraft_type",
            "registration",
            "checklist_status",
            "is_locked",
            "updated_at",
          ].join(","),
        )
        .order("updated_at", {
          ascending: false,
        })
        .limit(100);

      if (!roleCanViewHistory) {
        query = query.eq("owner_id", user.id);
      }

      if (historyStatus !== "all") {
        query = query.eq("checklist_status", historyStatus);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const normalizedSearch = historySearch.trim().toLowerCase();

      const filteredRecords = normalizedSearch
        ? (data || []).filter((record) => {
            const values = [
              record.flight_in,
              record.flight_out,
              record.bay,
              record.aircraft_type,
              record.registration,
            ];

            return values.some((value) =>
              String(value || "")
                .toLowerCase()
                .includes(normalizedSearch),
            );
          })
        : data || [];

      setHistoryRecords(filteredRecords);

      setStatusMessage(`${filteredRecords.length} checklist record(s) found`);
    } catch (error) {
      console.error("Checklist history load failed:", error);

      setStatusMessage("History load failed");

      window.alert(
        "Checklist history could not be loaded.\n\n" +
          (error?.message || "Unknown error"),
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  function showPerformanceSummary() {
    setFocusedTaskNumber(null);

    setActiveView("performance");

    setOperationsMenuOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function returnToChecklist() {
    setActiveView("checklist");

    setStatusMessage(
      checklistId
        ? `Returned to ${flight.flightOut || "saved checklist"}`
        : "Checklist ready",
    );
  }

  async function showHistory() {
    setFocusedTaskNumber(null);
    setActiveView("history");

    await loadChecklistHistory();
  }

  function createNewChecklist() {
    if (!roleCanCreate) {
      window.alert(
        "Your role does not have permission to create operational checklists.",
      );

      return;
    }

    clearChecklistState("New checklist ready");
  }

  async function loadAuditHistory(targetChecklistId = checklistId) {
    try {
      if (!targetChecklistId) {
        setAuditRecords([]);
        return;
      }

      if (!roleCanViewAudit) {
        setAuditRecords([]);
        return;
      }

      setAuditLoading(true);

      const { data, error } = await supabase
        .from("ramp_audit_logs")
        .select(
          [
            "id",
            "checklist_id",
            "user_id",
            "action",
            "entity_type",
            "old_values",
            "new_values",
            "created_at",
          ].join(","),
        )
        .eq("checklist_id", targetChecklistId)
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const userIds = [
        ...new Set(
          (data || []).map((record) => record.user_id).filter(Boolean),
        ),
      ];

      let profileMap = new Map();

      if (userIds.length > 0) {
        const { data: auditProfiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (!profileError && auditProfiles) {
          profileMap = new Map(
            auditProfiles.map((auditProfile) => [
              auditProfile.id,
              auditProfile.full_name,
            ]),
          );
        }
      }

      const enrichedRecords = (data || []).map((record) => ({
        ...record,
        user_name: profileMap.get(record.user_id) || "",
      }));

      setAuditRecords(enrichedRecords);
    } catch (error) {
      console.error("Audit history load failed:", error);

      window.alert(
        "Audit history could not be loaded.\n\n" +
          (error?.message || "Unknown error"),
      );
    } finally {
      setAuditLoading(false);
    }
  }

  loadAuditHistoryRef.current = loadAuditHistory;

  async function openChecklist(checklistIdentifier) {
    try {
      if (!user?.id) {
        throw new Error("Please sign in again.");
      }

      setLoadingRecord(true);

      setStatusMessage("Opening checklist...");

      const { data: checklist, error: checklistError } = await supabase
        .from("ramp_checklists")
        .select("*")
        .eq("id", checklistIdentifier)
        .maybeSingle();

      if (checklistError) {
        throw checklistError;
      }

      if (!checklist) {
        throw new Error("The selected checklist could not be found.");
      }

      const { data: savedItems, error: itemsError } = await supabase
        .from("ramp_checklist_items")
        .select("*")
        .eq("checklist_id", checklist.id)
        .order("item_number", {
          ascending: true,
        });

      if (itemsError) {
        throw itemsError;
      }

      skipNextAutosaveRef.current = true;

      checklistIdRef.current = checklist.id;

      setChecklistId(checklist.id);

      setRecordLocked(Boolean(checklist.is_locked));

      setFocusedTaskNumber(null);

      setApprovalDetails({
        approvedBy: checklist.approved_by || null,
        approvedByName: "",
        approvedAt: checklist.approved_at || null,
        notes: checklist.approval_notes || "",
      });

      if (checklist.approved_by) {
        const { data: approverProfile, error: approverError } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", checklist.approved_by)
          .maybeSingle();

        if (!approverError && approverProfile) {
          setApprovalDetails((currentDetails) => ({
            ...currentDetails,
            approvedByName: approverProfile.full_name || "",
          }));
        }
      }

      setFlight({
        flightIn: checklist.flight_in || "",
        flightOut: checklist.flight_out || "",
        flightDate: checklist.flight_date || "",
        bay: checklist.bay || "",
        aircraftType: checklist.aircraft_type || "",
        registration: checklist.registration || "",
        sta: normalizeDatabaseTime(checklist.sta),
        eta: normalizeDatabaseTime(checklist.eta),
        ata: normalizeDatabaseTime(checklist.ata),
        chocksOn: normalizeDatabaseTime(checklist.chocks_on),
        std: normalizeDatabaseTime(checklist.std),
        definedPushTime: normalizeDatabaseTime(checklist.defined_push_time),
        trcCoordinator:
          profile?.full_name || user?.email || checklist.trc_coordinator || "",
      });

      const savedItemsByTaskCode = new Map(
        (savedItems || [])
          .filter((savedItem) => Boolean(savedItem.task_code))
          .map((savedItem) => [savedItem.task_code, savedItem]),
      );

      const savedItemsByActivity = new Map(
        (savedItems || [])
          .filter((savedItem) => Boolean(savedItem.activity))
          .map((savedItem) => [
            String(savedItem.activity).trim().toLowerCase(),
            savedItem,
          ]),
      );

      setRows(
        CHECKLIST_ITEMS.map((item) => {
          const activityKey = item.activity.trim().toLowerCase();

          const savedItem =
            savedItemsByTaskCode.get(item.taskCode) ||
            savedItemsByActivity.get(activityKey);

          if (!savedItem) {
            return {
              actualTime: "",
              observation: "",
              status: "pending",
              delaySeconds: null,
              startedAt: null,
              startedBy: null,
            };
          }

          return {
            actualTime: normalizeDatabaseTime(savedItem.actual_time),
            observation: savedItem.observation || "",
            status:
              APPLICATION_STATUS[savedItem.operational_status] || "pending",
            delaySeconds: savedItem.delay_seconds,
            startedAt: savedItem.started_at || null,
            startedBy: savedItem.started_by || null,
          };
        }),
      );
      setActiveView("checklist");
      setActivePhase("All");
      setTaskView("outstanding");

      if (roleCanViewAudit) {
        await loadAuditHistory(checklist.id);
      } else {
        setAuditRecords([]);
      }

      setStatusMessage(`Opened ${checklist.flight_out}`);
    } catch (error) {
      console.error("Checklist open failed:", error);

      setStatusMessage("Open failed");

      window.alert(
        "The checklist could not be opened.\n\n" +
          (error?.message || "Unknown error"),
      );
    } finally {
      setLoadingRecord(false);
    }
  }

  async function approveChecklist(notes) {
    try {
      if (!user?.id) {
        throw new Error(
          "Your authenticated session could not be found. Sign in again.",
        );
      }

      if (!checklistId) {
        throw new Error("Save the checklist before approving it.");
      }

      if (recordLocked) {
        throw new Error("This checklist has already been approved and locked.");
      }

      setApproving(true);

      setStatusMessage("Approving checklist...");

      const { data, error } = await supabase.rpc("approve_ramp_checklist", {
        target_checklist_id: checklistId,
        supervisor_notes: notes?.trim() || null,
      });

      if (error) {
        throw error;
      }

      const approvedChecklist = Array.isArray(data) ? data[0] : data;

      if (!approvedChecklist) {
        throw new Error("Supabase did not return the approved checklist.");
      }

      setRecordLocked(true);

      setApprovalDetails({
        approvedBy: approvedChecklist.approved_by || user.id,
        approvedByName: profile?.full_name || user.email || "Authorised user",
        approvedAt: approvedChecklist.approved_at || new Date().toISOString(),
        notes: approvedChecklist.approval_notes || notes?.trim() || "",
      });

      if (roleCanViewAudit) {
        await loadAuditHistory(checklistId);
      }

      setStatusMessage(`Approved and locked: ${flight.flightOut}`);

      localStorage.removeItem("saa_ramp_checklist_draft");

      window.alert(
        "Checklist approved successfully.\n\n" +
          `Flight: ${flight.flightOut}\n` +
          "Status: Completed\n" +
          "Editing: Locked",
      );
    } catch (error) {
      console.error("Checklist approval failed:", error);

      setStatusMessage("Approval failed");

      window.alert(
        "The checklist could not be approved.\n\n" +
          (error?.message || "Unknown error"),
      );
    } finally {
      setApproving(false);
    }
  }

  function createOfflineChecklistPayload() {
    const checklistRecord = {
      id: checklistIdRef.current || checklistId || null,
      flight_in: flight.flightIn.trim() || null,
      flight_out: flight.flightOut.trim(),
      flight_date: flight.flightDate,
      bay: flight.bay.trim() || null,
      aircraft_type: flight.aircraftType || null,
      registration: flight.registration.trim() || null,
      sta: flight.sta || null,
      eta: flight.eta || null,
      ata: flight.ata || null,
      chocks_on: flight.chocksOn || null,
      std: flight.std || null,
      defined_push_time: flight.definedPushTime || null,
      trc_coordinator:
        profile?.full_name ||
        user?.email ||
        flight.trcCoordinator.trim() ||
        null,
      checklist_status:
        metrics.done === CHECKLIST_ITEMS.length ? "completed" : "in_progress",
    };

    const itemRecords = CHECKLIST_ITEMS.map((item, index) => {
      const row = rows[index];

      return {
        task_code: item.taskCode,
        item_number: item.itemNumber,
        phase: item.phase,
        activity: item.activity,
        impact_category: item.impactCategory,
        base_time: item.base,
        planned_offset_seconds: item.offsetSec,
        planned_time: plannedTimeFor(index) || null,
        actual_time: row?.actualTime || null,
        delay_seconds: row?.delaySeconds ?? null,
        operational_status: DATABASE_STATUS[row?.status] || "pending",
        observation: row?.observation?.trim() || null,
        started_at: row?.startedAt || null,
        started_by: row?.startedBy || null,
      };
    });

    return {
      checklist: checklistRecord,
      items: itemRecords,
    };
  }

  async function queueChecklistSnapshot(reason) {
    if (!user?.id) {
      throw new Error("A signed-in user is required to store a local draft.");
    }

    const activeChecklistId = checklistIdRef.current || checklistId || null;

    const localChecklistKey =
      activeChecklistId ||
      [flight.flightDate, flight.flightOut.trim().toUpperCase()]
        .filter(Boolean)
        .join("-") ||
      "new-checklist";

    const storedAt = new Date().toISOString();

    const draftRecord = {
      version: 1,
      checklistId: activeChecklistId,
      userId: user.id,
      storedAt,
      reason,
      flight,
      rows,
    };

    localStorage.setItem(
      "saa_ramp_checklist_draft",
      JSON.stringify(draftRecord),
    );

    const queuedAction = await queueOfflineAction({
      checklistId: activeChecklistId,
      actionType: "checklist_snapshot",
      payload: {
        ...createOfflineChecklistPayload(),
        metadata: {
          version: 1,
          stored_at: storedAt,
          reason,
          user_id: user.id,
          local_checklist_key: localChecklistKey,
          replay_supported: false,
        },
      },
      userId: user.id,
      baseVersion: activeChecklistId,
      deduplicationKey: `checklist_snapshot:${user.id}:${localChecklistKey}`,
    });

    const draftCount = await refreshPendingSyncCount();

    setConnectionStatus("pending");

    setStatusMessage(
      `${draftCount} local ${
        draftCount === 1 ? "draft" : "drafts"
      } stored on this device`,
    );

    return {
      saved: false,
      queued: true,
      offline: true,
      localDraft: true,
      actionId: queuedAction.id,
      reason,
    };
  }

  queueChecklistSnapshotRef.current = queueChecklistSnapshot;

  const persistChecklist = useCallback(
    async ({ silent = false, reason = "manual" } = {}) => {
      if (saveInProgressRef.current) {
        pendingSaveRef.current = true;

        return {
          saved: false,
          queued: true,
        };
      }

      if (!roleCanOperate) {
        if (!silent) {
          window.alert(
            "Your role does not have permission to save operational checklists.",
          );
        }

        return {
          saved: false,
          queued: false,
        };
      }

      if (recordLocked || approving) {
        if (!silent) {
          window.alert(
            "This checklist is locked or is currently being approved.",
          );
        }

        return {
          saved: false,
          queued: false,
        };
      }

      if (!user?.id) {
        if (!silent) {
          window.alert(
            "Your authenticated user could not be found. Sign in again.",
          );
        }

        return {
          saved: false,
          queued: false,
        };
      }

      if (!isFlightInformationComplete(flight)) {
        if (!silent) {
          window.alert(
            "Complete the required Flight Information before saving.\n\n" +
              "Required fields:\n" +
              "- Flight Out\n" +
              "- Flight Date\n" +
              "- Aircraft Type\n" +
              "- Registration\n" +
              "- STA Scheduled\n" +
              "- STD Scheduled",
          );
        }

        return {
          saved: false,
          queued: false,
        };
      }

      if (connectionStatus !== "online") {
        try {
          if (!queueChecklistSnapshotRef.current) {
            throw new Error("The offline checklist queue is not ready.");
          }

          const queuedResult = await queueChecklistSnapshotRef.current(reason);

          if (!silent) {
            window.alert(
              "The checklist could not be saved to Supabase.\n\n" +
                "A local draft was stored on this device for recovery.\n\n" +
                "Start, Complete, Undo, Approval, and automatic server synchronisation remain unavailable until the database service is reachable.",
            );
          }

          return queuedResult;
        } catch (error) {
          console.error("Offline checklist queue failed:", error);

          setStatusMessage("Offline storage failed");

          if (!silent) {
            window.alert(
              "The checklist could not be saved online or stored in the offline queue.\n\n" +
                (error?.message || "Unknown offline storage error"),
            );
          }

          return {
            saved: false,
            queued: false,
            offline: true,
            error,
            reason,
          };
        }
      }

      saveInProgressRef.current = true;

      pendingSaveRef.current = false;

      setSaving(true);

      setStatusMessage(silent ? "Autosaving..." : "Saving checklist...");

      try {
        const checklistRecord = {
          flight_in: flight.flightIn.trim() || null,
          flight_out: flight.flightOut.trim(),
          flight_date: flight.flightDate,
          bay: flight.bay.trim() || null,
          aircraft_type: flight.aircraftType || null,
          registration: flight.registration.trim() || null,
          sta: flight.sta || null,
          eta: flight.eta || null,
          ata: flight.ata || null,
          chocks_on: flight.chocksOn || null,
          std: flight.std || null,
          defined_push_time: flight.definedPushTime || null,
          trc_coordinator:
            profile?.full_name ||
            user?.email ||
            flight.trcCoordinator.trim() ||
            null,
          checklist_status:
            metrics.done === CHECKLIST_ITEMS.length
              ? "completed"
              : "in_progress",
          owner_id: user.id,
        };

        let activeChecklistId = checklistIdRef.current || checklistId;

        if (!activeChecklistId) {
          const { data, error } = await supabase
            .from("ramp_checklists")
            .insert(checklistRecord)
            .select()
            .single();

          if (error) {
            throw error;
          }

          activeChecklistId = data.id;

          checklistIdRef.current = data.id;

          setChecklistId(data.id);
        } else {
          const updateRecord = {
            ...checklistRecord,
          };

          delete updateRecord.owner_id;

          const { data: updatedChecklist, error } = await supabase
            .from("ramp_checklists")
            .update(updateRecord)
            .eq("id", activeChecklistId)
            .select("id")
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (!updatedChecklist) {
            throw new Error(
              "The checklist was not updated. The database policy may not allow this account to update the selected checklist.",
            );
          }
        }

        const itemRecords = CHECKLIST_ITEMS.map((item, index) => {
          const row = rows[index];

          return {
            checklist_id: activeChecklistId,
            task_code: item.taskCode,
            item_number: item.itemNumber,
            phase: item.phase,
            activity: item.activity,
            impact_category: item.impactCategory,
            base_time: item.base,
            planned_offset_seconds: item.offsetSec,
            planned_time: plannedTimeForRef.current?.(index) || null,
            observation: row.observation?.trim() || null,
          };
        });

        const { error: itemError } = await supabase
          .from("ramp_checklist_items")
          .upsert(itemRecords, {
            onConflict: "checklist_id,task_code",
          });

        if (itemError) {
          throw itemError;
        }

        const activeTaskCodes = CHECKLIST_ITEMS.map((item) => item.taskCode);

        const { count: savedItemCount, error: itemCountError } = await supabase
          .from("ramp_checklist_items")
          .select("id", {
            count: "exact",
            head: true,
          })
          .eq("checklist_id", activeChecklistId)
          .in("task_code", activeTaskCodes);

        if (itemCountError) {
          throw itemCountError;
        }

        if (savedItemCount !== CHECKLIST_ITEMS.length) {
          throw new Error(
            `Only ${savedItemCount ?? 0} of ${
              CHECKLIST_ITEMS.length
            } task records were saved.`,
          );
        }

        localStorage.setItem(
          "saa_ramp_checklist_draft",
          JSON.stringify({
            checklistId: activeChecklistId,
            flight,
            rows,
          }),
        );

        const savedTime = new Date().toLocaleTimeString("en-ZA", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

        setStatusMessage(
          silent
            ? `Autosaved at ${savedTime}`
            : `Saved to Supabase at ${savedTime}`,
        );

        if (!silent && roleCanViewAudit && loadAuditHistoryRef.current) {
          await loadAuditHistoryRef.current(activeChecklistId);
        }

        if (!silent) {
          window.alert(
            "OPS checklist saved successfully.\n\n" +
              `Flight: ${flight.flightOut}\n` +
              `Completed: ${metrics.done}/${CHECKLIST_ITEMS.length}`,
          );
        }

        return {
          saved: true,
          checklistId: activeChecklistId,
          reason,
        };
      } catch (error) {
        console.error(
          silent ? "Checklist autosave failed:" : "Checklist save failed:",
          error,
        );

        const saveErrorMessage = error?.message || "Unknown database error";

        setStatusMessage(
          silent ? `Autosave failed: ${saveErrorMessage}` : "Save failed",
        );

        if (!silent) {
          window.alert(
            "The checklist could not be saved.\n\n" +
              (error?.message || "Unknown error"),
          );
        }

        return {
          saved: false,
          error,
          reason,
        };
      } finally {
        saveInProgressRef.current = false;

        setSaving(false);

        if (pendingSaveRef.current) {
          pendingSaveRef.current = false;

          setStatusMessage("Unsaved changes");
        }
      }
    },
    [
      approving,
      checklistId,
      connectionStatus,
      flight,
      metrics.done,
      profile?.full_name,
      recordLocked,
      roleCanOperate,
      roleCanViewAudit,
      rows,
      user?.email,
      user?.id,
    ],
  );

  async function saveChecklist() {
    await persistChecklist({
      silent: false,
      reason: "manual",
    });
  }

  useEffect(() => {
    if (
      !autosaveReady ||
      initialLoadRef.current ||
      loadingRecord ||
      activeView !== "checklist" ||
      !roleCanOperate ||
      recordLocked ||
      approving ||
      !flightInformationComplete
    ) {
      return undefined;
    }

    if (skipNextAutosaveRef.current) {
      skipNextAutosaveRef.current = false;

      return undefined;
    }

    setStatusMessage("Unsaved changes");

    const autosaveTimer = window.setTimeout(async () => {
      await persistChecklist({
        silent: true,
        reason: "autosave",
      });
    }, AUTOSAVE_DELAY_MS);

    return () => {
      window.clearTimeout(autosaveTimer);
    };
  }, [
    activeView,
    approving,
    autosaveReady,
    flight,
    flightInformationComplete,
    loadingRecord,
    persistChecklist,
    recordLocked,
    roleCanOperate,
    rows,
  ]);

  const nextPendingCandidate = CHECKLIST_ITEMS.map((item, index) => {
    const row = rows[index];

    const plannedDateTime = plannedDateTimeFor(index);

    const plannedTime = formatDateTimeAsTime(plannedDateTime);

    const timing = getPendingTaskTiming(
      plannedDateTime,
      operationalNow,
      `Awaiting ${requiredTimeLabelFor(item)}`,
    );

    return {
      item,
      row,
      plannedTime,
      plannedDateTime,
      timing,
    };
  })
    .filter(({ row }) => row?.status === "pending")
    .sort(compareTaskCandidates)[0];

  const nextTaskLabel = nextPendingCandidate
    ? nextPendingCandidate.item.activity
    : "All activities complete";

  return (
    <main className="ramp-page">
      <ChecklistPrintReport
        flight={flight}
        rows={rows}
        metrics={metrics}
        operationalMetrics={operationalMetrics}
        preArrivalMetrics={preArrivalMetrics}
        plannedTimeFor={plannedTimeFor}
        profile={profile}
      />

      <OperationsMenu
        open={operationsMenuOpen}
        onClose={() => setOperationsMenuOpen(false)}
        flight={flight}
        profile={profile}
        completedCount={metrics.done}
        totalCount={CHECKLIST_ITEMS.length}
        nextTaskLabel={nextTaskLabel}
        phases={CHECKLIST_PHASES}
        activePhase={activePhase}
        onPhaseChange={navigateToPhase}
        onNavigate={navigateToSection}
        onNextTask={openNextPendingTask}
        onHistory={showHistory}
        onSave={saveChecklist}
        onReset={resetChecklist}
        onPrint={() => window.print()}
        onExport={openExcelExport}
        onSignOut={handleSignOut}
        canSave={roleCanOperate}
        canExport={roleCanExport && Boolean(checklistId)}
        saveDisabled={saving || approving || recordLocked}
        resetDisabled={checklistReadOnly}
      />
      <header className="ramp-header">
        <div className="ramp-brand">
          <div className="ramp-brand-logo">
            <AppLogo
              className="saa-app-logo"
              alt="OPS Check-List GRU - Turnaround Report"
            />
          </div>

          <div>
            <h1>OPS Check-List GRU - Turnaround Report</h1>

            <p>PTS Turnaround Performance Report</p>
          </div>
        </div>

        <div className="ramp-header-actions">
          <div className="ramp-user">
            <strong>
              {profile?.full_name || user?.email || "Operational User"}
            </strong>

            <span>{getRoleLabel(profile?.role)}</span>
          </div>

          <LiveClock />

          <OperationsMenuButton onClick={() => setOperationsMenuOpen(true)} />
        </div>
      </header>

      <section className="ramp-content">
        <div className="ramp-status-bar">
          <div
            className={`connection-indicator connection-${connectionStatus}`}
            role="status"
            aria-live="polite"
          >
            <span className="connection-indicator-dot" aria-hidden="true" />

            <span>
              {getConnectionLabel(connectionStatus, pendingSyncCount)}
            </span>
          </div>

          <span className="ramp-status-divider">|</span>

          <span className="ramp-status-message">
            {loadingRecord
              ? "Loading checklist..."
              : !flightInformationComplete && activeView === "checklist"
                ? "Complete the required Flight Information to enable the checklist and autosave."
                : statusMessage}
          </span>
        </div>

        {pendingSyncCount > 0 ? (
          <div className="local-draft-notice" role="status">
            <strong>Local draft protection active</strong>

            <span>
              The latest checklist data is stored on this device. Automatic
              replay to Supabase is not enabled, so confirm an online save
              before relying on another device.
            </span>
          </div>
        ) : null}

        {activeView === "history" ? (
          <div className="history-view">
            <div className="history-navigation">
              <button
                type="button"
                className="ramp-button ramp-button-light"
                onClick={returnToChecklist}
              >
                <ArrowLeft size={17} aria-hidden="true" />
                Back to Checklist
              </button>
            </div>

            {roleCanExport ? (
              <div id="excel-export">
                <ChecklistExport profile={profile} />
              </div>
            ) : null}

            <ChecklistHistory
              records={historyRecords}
              loading={historyLoading}
              searchValue={historySearch}
              statusValue={historyStatus}
              onSearchChange={setHistorySearch}
              onStatusChange={setHistoryStatus}
              onRefresh={loadChecklistHistory}
              onOpen={openChecklist}
              onNew={createNewChecklist}
              canCreate={roleCanCreate}
            />
          </div>
        ) : null}

        {activeView === "performance" ? (
          <ChecklistPerformanceSummary
            flight={flight}
            rows={rows}
            metrics={metrics}
            operationalMetrics={operationalMetrics}
            preArrivalMetrics={preArrivalMetrics}
            plannedTimeFor={plannedTimeFor}
            canExport={roleCanExport && Boolean(checklistId)}
            onBack={returnToChecklist}
            onExport={exportCurrentPowerBiData}
          />
        ) : null}

        {activeView === "checklist" ? (
          <>
            {recordLocked ? (
              <div className="locked-banner">
                This checklist has been approved and locked. It is available for
                review but cannot be saved again.
              </div>
            ) : null}

            {!recordLocked && roleIsReadOnly ? (
              <div className="readonly-banner">
                You are viewing this checklist in read-only mode as{" "}
                {getRoleLabel(profile?.role)}.
              </div>
            ) : null}

            <div id="flight-information">
              <FlightInformation
                flight={flight}
                coordinatorName={profile?.full_name || user?.email || ""}
                onChange={updateFlight}
                onLandingNow={markLandingRealNow}
                onChocksNow={markChocksOnNow}
                disabled={flightInformationDisabled}
              />
            </div>

            <div id="pushback-countdown">
              <PushbackCountdown
                chocksOn={flight.chocksOn}
                definedPushTime={flight.definedPushTime}
                disabled={checklistReadOnly}
              />
            </div>

            <section className="pre-arrival-readiness-summary">
              <div className="readiness-summary-heading">
                <div>
                  <span className="readiness-summary-eyebrow">Pre-Arrival</span>

                  <h2>Readiness Summary</h2>
                </div>

                <strong>
                  {preArrivalMetrics.done}/{preArrivalMetrics.total}
                </strong>
              </div>

              <div className="readiness-summary-grid">
                <div>
                  <span>Pending</span>

                  <strong>{preArrivalMetrics.pending}</strong>
                </div>

                <div>
                  <span>Ready on Time</span>

                  <strong>{preArrivalMetrics.ontime}</strong>
                </div>

                <div>
                  <span>Slightly Delayed</span>

                  <strong>{preArrivalMetrics.light}</strong>
                </div>

                <div>
                  <span>Delayed</span>

                  <strong>{preArrivalMetrics.delay}</strong>
                </div>

                <div>
                  <span>High-Impact Exceptions</span>

                  <strong>{preArrivalMetrics.highImpactDelay}</strong>
                </div>
              </div>

              <p className="readiness-summary-note">
                Pre-Arrival activities are monitored against STA for station
                readiness and are reported separately from turnaround
                operational performance.
              </p>
            </section>

            <div id="performance-summary">
              <ChecklistMetrics
                metrics={operationalMetrics}
                totalItems={operationalMetrics.total}
              />
            </div>

            <div id="approval-section">
              <ChecklistApproval
                checklistId={checklistId}
                profile={profile}
                locked={recordLocked}
                approvalDetails={approvalDetails}
                approving={approving}
                onApprove={approveChecklist}
              />
            </div>

            {checklistId && roleCanViewAudit ? (
              <div id="audit-history">
                <ChecklistAuditHistory
                  records={auditRecords}
                  loading={auditLoading}
                  onRefresh={() => loadAuditHistory(checklistId)}
                />
              </div>
            ) : null}

            <section
              className="task-view-controls"
              aria-label="Checklist task view"
            >
              <div className="task-view-heading">
                <div>
                  <span>Activity View</span>

                  <strong>Choose which checklist activities to display</strong>
                </div>

                <span className="task-view-result-count">
                  {visibleItems.length} shown
                </span>
              </div>

              <div className="task-view-buttons">
                <button
                  type="button"
                  className={
                    taskView === "outstanding"
                      ? "task-view-button active"
                      : "task-view-button"
                  }
                  onClick={() => {
                    setTaskView("outstanding");
                    setFocusedTaskNumber(null);
                  }}
                  aria-pressed={taskView === "outstanding"}
                >
                  Outstanding
                  <span>{metrics.pending}</span>
                </button>

                <button
                  type="button"
                  className={
                    taskView === "completed"
                      ? "task-view-button active"
                      : "task-view-button"
                  }
                  onClick={() => {
                    setTaskView("completed");
                    setFocusedTaskNumber(null);
                  }}
                  aria-pressed={taskView === "completed"}
                >
                  Completed
                  <span>{metrics.done}</span>
                </button>

                <button
                  type="button"
                  className={
                    taskView === "all"
                      ? "task-view-button active"
                      : "task-view-button"
                  }
                  onClick={() => {
                    setTaskView("all");
                    setFocusedTaskNumber(null);
                  }}
                  aria-pressed={taskView === "all"}
                >
                  All
                  <span>{metrics.total}</span>
                </button>
              </div>
            </section>

            <section
              id="checklist-tasks"
              className="phase-tabs"
              aria-label="Checklist phases"
            >
              {CHECKLIST_PHASES.map((phase) => (
                <button
                  key={phase}
                  type="button"
                  className={
                    activePhase === phase ? "phase-tab active" : "phase-tab"
                  }
                  onClick={() => {
                    setActivePhase(phase);

                    setFocusedTaskNumber(null);
                  }}
                >
                  <span>{phase}</span>

                  <span className="phase-tab-count">
                    {getIncompletePhaseCount(phase)}
                  </span>
                </button>
              ))}
            </section>

            <section
              className="pts-task-table"
              aria-label="PTS checklist activities"
              data-focused-task={focusedTaskNumber || ""}
            >
              <div className="pts-task-header" role="row">
                <span>#</span>
                <span>Phase</span>
                <span>Activity</span>
                <span>Reference</span>
                <span>Planned</span>
                <span>Actual</span>
                <span>Delay</span>
                <span>Status</span>
                <span>Action</span>
                <span>Comment</span>
              </div>

              <div className="checklist-list">
                {visibleItems.length === 0 ? (
                  <div className="checklist-empty-state">
                    <ClipboardCheck size={28} aria-hidden="true" />

                    <strong>
                      {taskView === "outstanding"
                        ? "No outstanding activities"
                        : taskView === "completed"
                          ? "No completed activities"
                          : "No activities available"}
                    </strong>

                    <span>
                      {taskView === "outstanding"
                        ? "All activities in this phase have been completed."
                        : taskView === "completed"
                          ? "No activities in this phase have been completed yet."
                          : "No checklist activities match the selected phase."}
                    </span>
                  </div>
                ) : null}
                {visibleItems.map((item) => {
                  const index = item.itemNumber - 1;

                  const row = rows[index];

                  if (!row) {
                    return null;
                  }

                  const plannedDateTime = plannedDateTimeFor(index);

                  const plannedTime = formatDateTimeAsTime(plannedDateTime);

                  const pendingTiming =
                    row.status === "pending"
                      ? getPendingTaskTiming(
                          plannedDateTime,
                          operationalNow,
                          `Awaiting ${requiredTimeLabelFor(item)}`,
                        )
                      : {
                          overdue: false,
                          overdueSeconds: 0,
                          remainingSeconds: 0,
                          progressPercent: 100,
                          label: "",
                        };

                  return (
                    <ChecklistActivity
                      key={item.taskCode}
                      item={item}
                      row={row}
                      plannedTime={plannedTime}
                      processing={isTaskProcessing(item.itemNumber)}
                      overdue={pendingTiming.overdue}
                      remainingSeconds={pendingTiming.remainingSeconds}
                      timingLabel={pendingTiming.label}
                      onObservationChange={(value) =>
                        updateObservation(item.itemNumber, value)
                      }
                      onStart={() => startActivity(item.itemNumber)}
                      onMark={() => markActivity(item.itemNumber)}
                      observationDisabled={observationsDisabled}
                      completeDisabled={checklistActivitiesDisabled}
                      canUndo={roleCanUndoTask}
                    />
                  );
                })}
              </div>
            </section>
          </>
        ) : null}
      </section>

      {activeView === "checklist" ? (
        <button
          type="button"
          className="standalone-checklist-button"
          onClick={openNextPendingTask}
          disabled={
            loadingRecord || historyLoading || !flightInformationComplete
          }
          aria-label="Open next checklist task"
          title={
            flightInformationComplete
              ? "Open next checklist task"
              : "Complete Flight Information first"
          }
        >
          <ClipboardCheck size={20} aria-hidden="true" />

          <span>Checklist</span>
        </button>
      ) : null}
    </main>
  );
}
