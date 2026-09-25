import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ArrowLeft,
} from "lucide-react";

import AppLogo from "../components/AppLogo";
import LiveClock from "../components/LiveClock";
import ChecklistActivity from "../components/checklist/ChecklistActivity";
import ChecklistApproval from "../components/checklist/ChecklistApproval";
import ChecklistAuditHistory from "../components/checklist/ChecklistAuditHistory";
import ChecklistExport from "../components/checklist/ChecklistExport";
import ChecklistHistory from "../components/checklist/ChecklistHistory";
import ChecklistMetrics from "../components/checklist/ChecklistMetrics";
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
  calculateDelaySeconds,
  classifyDelay,
  currentTime,
  getPendingTaskTiming,
  normalizeDatabaseTime,
  secondsToTime,
  timeToSeconds,
} from "../utils/checklistTime";
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
  return new Date()
    .toISOString()
    .slice(0, 10);
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

function createInitialFlight(
  coordinatorName = ""
) {
  return {
    ...EMPTY_FLIGHT,
    flightDate: getTodayDate(),
    trcCoordinator:
      coordinatorName,
  };
}

function compareTaskCandidates(
  firstCandidate,
  secondCandidate
) {
  if (
    firstCandidate.timing.overdue !==
    secondCandidate.timing.overdue
  ) {
    return firstCandidate.timing.overdue
      ? -1
      : 1;
  }

  const firstTime =
    timeToSeconds(
      firstCandidate.plannedTime
    );

  const secondTime =
    timeToSeconds(
      secondCandidate.plannedTime
    );

  if (
    firstTime === null &&
    secondTime === null
  ) {
    return (
      firstCandidate.item.itemNumber -
      secondCandidate.item.itemNumber
    );
  }

  if (firstTime === null) {
    return 1;
  }

  if (secondTime === null) {
    return -1;
  }

  if (firstTime === secondTime) {
    return (
      firstCandidate.item.itemNumber -
      secondCandidate.item.itemNumber
    );
  }

  return firstTime - secondTime;
}

export default function DashboardPage() {
  const {
    user,
    profile,
    signOut,
  } = useAuth();

  const [flight, setFlight] =
    useState(() =>
      createInitialFlight(
        profile?.full_name || ""
      )
    );

  const [rows, setRows] =
    useState(
      createEmptyChecklistRows
    );

  const [
    activePhase,
    setActivePhase,
  ] = useState("All");

  const [
    checklistId,
    setChecklistId,
  ] = useState(null);

  const [saving, setSaving] =
    useState(false);

  const [
    loadingRecord,
    setLoadingRecord,
  ] = useState(false);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("Not saved");

  const [
    activeView,
    setActiveView,
  ] = useState("checklist");

  const [
    historyRecords,
    setHistoryRecords,
  ] = useState([]);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(false);

  const [
    historySearch,
    setHistorySearch,
  ] = useState("");

  const [
    historyStatus,
    setHistoryStatus,
  ] = useState("all");

  const [
    recordLocked,
    setRecordLocked,
  ] = useState(false);

  const [
    approving,
    setApproving,
  ] = useState(false);

  const [
    approvalDetails,
    setApprovalDetails,
  ] = useState(
    EMPTY_APPROVAL_DETAILS
  );

  const [
    auditRecords,
    setAuditRecords,
  ] = useState([]);

  const [
    auditLoading,
    setAuditLoading,
  ] = useState(false);

  const [
    operationalNow,
    setOperationalNow,
  ] = useState(() => new Date());

  const [, setFocusedTaskNumber] =
    useState(null);

  const [
    operationsMenuOpen,
    setOperationsMenuOpen,
  ] = useState(false);

  const roleCanCreate =
    canCreateChecklist(
      profile?.role
    );

  const roleCanOperate =
    canOperateChecklist(
      profile?.role
    );

  const roleCanCompleteTask =
    canCompletePendingTask(
      profile?.role
    );

  const roleCanUndoTask =
    canUndoCompletedTask(
      profile?.role
    );

  const roleCanEditFlight =
    canEditFlightInformation(
      profile?.role
    );

  const roleCanEditObservation =
    canEditObservations(
      profile?.role
    );

  const roleCanViewHistory =
    canViewOperationalHistory(
      profile?.role
    );

  const roleCanViewAudit =
    canViewAuditHistory(
      profile?.role
    );

  const roleCanExport =
    canExportReports(
      profile?.role
    );

  const roleIsReadOnly =
    isReadOnlyRole(
      profile?.role
    );

  const checklistReadOnly =
    recordLocked ||
    approving ||
    roleIsReadOnly ||
    !roleCanOperate;

  const flightInformationDisabled =
    recordLocked ||
    approving ||
    !roleCanEditFlight;

  const observationsDisabled =
    recordLocked ||
    approving ||
    !roleCanEditObservation;

  const taskCompletionDisabled =
    recordLocked ||
    approving ||
    !roleCanCompleteTask;

  useEffect(() => {
    const intervalId =
      window.setInterval(() => {
        setOperationalNow(
          new Date()
        );
      }, 1000);

    return () => {
      window.clearInterval(
        intervalId
      );
    };
  }, []);

  function baseTimeForItem(
    item
  ) {
    switch (item?.base) {
      case "arrival":
        return (
          flight.eta ||
          flight.sta
        );

      case "std":
        return flight.std;

      case "defined_push":
        return (
          flight.definedPushTime ||
          flight.std
        );

      case "chocks_on":
        return flight.chocksOn;

      default:
        console.warn(
          `Unknown timing base "${item?.base}" for task ${item?.taskCode ||
          item?.itemNumber ||
          "unknown"
          }.`
        );

        return "";
    }
  }

  function plannedTimeFor(index) {
    const item =
      CHECKLIST_ITEMS[index];

    if (!item) {
      return "";
    }

    const baseTime =
      baseTimeForItem(
        item
      );

    const baseSeconds =
      timeToSeconds(
        baseTime
      );

    if (baseSeconds === null) {
      return "";
    }

    return secondsToTime(
      baseSeconds +
      item.offsetSec
    );
  }

  function requiredTimeLabelFor(
    item
  ) {
    switch (item?.base) {
      case "arrival":
        return "ETA MVT or STA Scheduled";

      case "std":
        return "STD Scheduled";

      case "defined_push":
        return "Defined Push Time or STD Scheduled";

      case "chocks_on":
        return "Chocks On Real";

      default:
        return "the required operational time";
    }
  }

  const metrics = useMemo(() => {
    return rows.reduce(
      (totals, row) => {
        if (
          row.status !== "pending"
        ) {
          totals.done += 1;
        }

        if (
          row.status === "ontime"
        ) {
          totals.ontime += 1;
        }

        if (
          row.status === "light"
        ) {
          totals.light += 1;
        }

        if (
          row.status === "delay"
        ) {
          totals.delay += 1;
        }

        return totals;
      },
      {
        done: 0,
        ontime: 0,
        light: 0,
        delay: 0,
      }
    );
  }, [rows]);

  const matchingItems =
    activePhase === "All"
      ? CHECKLIST_ITEMS
      : CHECKLIST_ITEMS.filter(
        (item) =>
          item.phase ===
          activePhase
      );

  const visibleItems =
    [...matchingItems].sort(
      (
        firstItem,
        secondItem
      ) => {
        const firstIndex =
          firstItem.itemNumber - 1;

        const secondIndex =
          secondItem.itemNumber - 1;

        const firstTime =
          timeToSeconds(
            plannedTimeFor(
              firstIndex
            )
          );

        const secondTime =
          timeToSeconds(
            plannedTimeFor(
              secondIndex
            )
          );

        if (
          firstTime === null &&
          secondTime === null
        ) {
          return (
            firstItem.itemNumber -
            secondItem.itemNumber
          );
        }

        if (firstTime === null) {
          return 1;
        }

        if (secondTime === null) {
          return -1;
        }

        if (
          firstTime === secondTime
        ) {
          return (
            firstItem.itemNumber -
            secondItem.itemNumber
          );
        }

        return (
          firstTime -
          secondTime
        );
      }
    );

  function updateFlight(
    field,
    value
  ) {
    if (
      flightInformationDisabled
    ) {
      return;
    }

    setFlight(
      (currentFlight) => ({
        ...currentFlight,
        [field]: value,
      })
    );

    setFocusedTaskNumber(null);
    setStatusMessage("Not saved");
  }

  function updateRowState(
    itemNumber,
    changes
  ) {
    const index =
      itemNumber - 1;

    setRows((currentRows) =>
      currentRows.map(
        (row, rowIndex) =>
          rowIndex === index
            ? {
              ...row,
              ...changes,
            }
            : row
      )
    );
  }

  function updateObservation(
    itemNumber,
    value
  ) {
    if (
      observationsDisabled
    ) {
      return;
    }

    updateRowState(
      itemNumber,
      {
        observation: value,
      }
    );

    setStatusMessage(
      "Not saved"
    );
  }

  async function startActivity(
    itemNumber
  ) {
    if (
      taskCompletionDisabled
    ) {
      window.alert(
        "Your role cannot start this task, or the checklist is locked."
      );

      return;
    }

    if (!checklistId) {
      window.alert(
        "Save the new checklist before starting tasks."
      );

      return;
    }

    if (!user?.id) {
      window.alert(
        "Your authenticated session could not be found. Please sign in again."
      );

      return;
    }

    const index =
      itemNumber - 1;

    const row =
      rows[index];

    const item =
      CHECKLIST_ITEMS[index];

    if (!row || !item) {
      window.alert(
        "The selected task could not be found."
      );

      return;
    }

    if (
      row.status !== "pending"
    ) {
      window.alert(
        "This task is already completed."
      );

      return;
    }

    if (row.startedAt) {
      window.alert(
        "This task has already been started."
      );

      return;
    }

    const plannedTime =
      plannedTimeFor(index);

    if (!plannedTime) {
      window.alert(
        `Record ${requiredTimeLabelFor(
          item
        )} before starting this task.`
      );

      return;
    }

    try {
      setStatusMessage(
        `Starting: ${item.activity}`
      );

      const {
        data,
        error,
      } = await supabase.rpc(
        "start_ramp_task_once",
        {
          target_checklist_id:
            checklistId,
          target_task_code:
            item.taskCode,
        }
      );

      if (error) {
        throw error;
      }

      const startedItem =
        Array.isArray(data)
          ? data[0]
          : data;

      if (!startedItem) {
        throw new Error(
          "Supabase did not return the started task."
        );
      }

      if (!startedItem.started_at) {
        throw new Error(
          "The task was not marked as started."
        );
      }

      updateRowState(
        itemNumber,
        {
          startedAt:
            startedItem.started_at,
          startedBy:
            startedItem.started_by ||
            user.id,
        }
      );

      setStatusMessage(
        `Started: ${item.activity}`
      );
    } catch (error) {
      console.error(
        "Task start failed:",
        error
      );

      setStatusMessage(
        "Task start failed"
      );

      window.alert(
        "The task could not be started.\n\n" +
        (error?.message ||
          "Unknown error")
      );
    }
  }

  async function markActivity(
    itemNumber
  ) {
    if (
      taskCompletionDisabled
    ) {
      window.alert(
        "Your role cannot complete this task, or the checklist is locked."
      );

      return;
    }

    if (!checklistId) {
      window.alert(
        "Save the checklist before completing tasks."
      );

      return;
    }

    if (!user?.id) {
      window.alert(
        "Your authenticated session could not be found. Please sign in again."
      );

      return;
    }

    const index =
      itemNumber - 1;

    const row =
      rows[index];

    const item =
      CHECKLIST_ITEMS[index];

    if (!row || !item) {
      window.alert(
        "The selected task could not be found."
      );

      return;
    }

    if (
      row.status !== "pending"
    ) {
      if (!roleCanUndoTask) {
        window.alert(
          "Your role cannot change a completed task."
        );

        return;
      }

      updateRowState(
        itemNumber,
        {
          actualTime: "",
          status: "pending",
          delaySeconds: null,
          startedAt: null,
          startedBy: null,
        }
      );

      setStatusMessage(
        "Task returned to pending"
      );

      return;
    }

    if (!row.startedAt) {
      window.alert(
        "Start this task before completing it."
      );

      return;
    }

    const plannedTime =
      plannedTimeFor(index);

    if (!plannedTime) {
      window.alert(
        `Record ${requiredTimeLabelFor(
          item
        )} before completing this task.`
      );

      return;
    }

    const actualTime =
      currentTime();

    const delaySeconds =
      calculateDelaySeconds(
        actualTime,
        plannedTime
      );

    if (
      delaySeconds === null
    ) {
      window.alert(
        "The task performance could not be calculated because its planned time is unavailable."
      );

      return;
    }

    const completedStatus =
      classifyDelay(
        delaySeconds
      );

    setStatusMessage(
      `Completing: ${item.activity}`
    );

    const {
      data,
      error,
    } = await supabase.rpc(
      "complete_ramp_task_once",
      {
        target_checklist_id:
          checklistId,
        target_task_code:
          item.taskCode,
        recorded_actual_time:
          actualTime,
        calculated_delay_seconds:
          delaySeconds,
        calculated_operational_status:
          DATABASE_STATUS[
          completedStatus
          ] || "pending",
      }
    );

    if (error) {
      console.error(
        "Task completion failed:",
        error
      );

      setStatusMessage(
        "Task completion failed"
      );

      window.alert(
        "The task could not be completed.\n\n" +
        (error.message ||
          "Unknown error")
      );

      return;
    }

    const updatedCompletion =
      Array.isArray(data)
        ? data[0]
        : data;

    if (!updatedCompletion) {
      setStatusMessage(
        "Task completion failed"
      );

      window.alert(
        "Supabase did not return the completed task."
      );

      return;
    }

    updateRowState(
      itemNumber,
      {
        actualTime:
          normalizeDatabaseTime(
            updatedCompletion.actual_time
          ) || actualTime,
        delaySeconds:
          updatedCompletion.delay_seconds ??
          delaySeconds,
        status:
          APPLICATION_STATUS[
          updatedCompletion
            .operational_status
          ] || completedStatus,
        startedAt:
          updatedCompletion.started_at ||
          row.startedAt,
        startedBy:
          updatedCompletion.started_by ||
          row.startedBy,
      }
    );

    setStatusMessage(
      `Completed and saved: ${item.activity}`
    );
  }

  function markLandingRealNow() {
    if (flightInformationDisabled) {
      window.alert(
        "This checklist is read-only for your current role or has already been locked."
      );

      return;
    }

    updateFlight(
      "ata",
      currentTime()
    );
  }

  function markChocksOnNow() {
    if (flightInformationDisabled) {
      window.alert(
        "This checklist is read-only for your current role or has already been locked."
      );

      return;
    }

    updateFlight(
      "chocksOn",
      currentTime()
    );
  }

  function openNextPendingTask() {
    const pendingCandidates =
      CHECKLIST_ITEMS
        .map((item, index) => {
          const row =
            rows[index];

          const plannedTime =
            plannedTimeFor(index);

          const timing =
            getPendingTaskTiming(
              plannedTime,
              operationalNow
            );

          return {
            item,
            row,
            plannedTime,
            timing,
          };
        })
        .filter(
          ({ row }) =>
            row?.status ===
            "pending"
        )
        .sort(
          compareTaskCandidates
        );

    if (
      pendingCandidates.length ===
      0
    ) {
      window.alert(
        "All checklist activities are complete."
      );

      return;
    }

    const nextCandidate =
      pendingCandidates[0];

    setActiveView("checklist");
    setActivePhase("All");

    setFocusedTaskNumber(
      nextCandidate.item
        .itemNumber
    );

    setStatusMessage(
      nextCandidate.timing
        .overdue
        ? `Next overdue task: ${nextCandidate.item.activity}`
        : `Next pending task: ${nextCandidate.item.activity}`
    );

    window.setTimeout(() => {
      document
        .getElementById(
          `checklist-task-${nextCandidate.item.itemNumber}`
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 150);
  }

  function navigateToSection(
    sectionId
  ) {
    setActiveView("checklist");

    window.setTimeout(() => {
      document
        .getElementById(
          sectionId
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  function navigateToPhase(
    phase
  ) {
    setActiveView("checklist");
    setActivePhase(phase);
    setFocusedTaskNumber(null);

    window.setTimeout(() => {
      document
        .getElementById(
          "checklist-tasks"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 100);
  }

  async function openExcelExport() {
    setActiveView("history");

    await loadChecklistHistory();

    window.setTimeout(() => {
      document
        .getElementById(
          "excel-export"
        )
        ?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
    }, 150);
  }

  async function handleSignOut() {
    const { error } =
      await signOut();

    if (error) {
      window.alert(
        `Sign out failed: ${error.message}`
      );
    }
  }

  function clearChecklistState(
    message
  ) {
    setFlight(
      createInitialFlight(
        profile?.full_name || ""
      )
    );

    setRows(
      createEmptyChecklistRows()
    );

    setActivePhase("All");
    setChecklistId(null);
    setRecordLocked(false);
    setFocusedTaskNumber(null);

    setApprovalDetails({
      ...EMPTY_APPROVAL_DETAILS,
    });

    setAuditRecords([]);
    setStatusMessage(message);
    setActiveView("checklist");

    localStorage.removeItem(
      "saa_ramp_checklist_draft"
    );
  }

  function resetChecklist() {
    if (checklistReadOnly) {
      window.alert(
        "This checklist is read-only and cannot be reset."
      );

      return;
    }

    const confirmed =
      window.confirm(
        "Reset the current checklist and clear all entered data?"
      );

    if (!confirmed) {
      return;
    }

    clearChecklistState(
      "Not saved"
    );
  }

  async function loadChecklistHistory() {
    try {
      if (!user?.id) {
        throw new Error(
          "Please sign in again."
        );
      }

      setHistoryLoading(true);

      setStatusMessage(
        "Loading checklist history..."
      );

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
          ].join(",")
        )
        .order("updated_at", {
          ascending: false,
        })
        .limit(100);

      if (!roleCanViewHistory) {
        query = query.eq(
          "owner_id",
          user.id
        );
      }

      if (
        historyStatus !== "all"
      ) {
        query = query.eq(
          "checklist_status",
          historyStatus
        );
      }

      const {
        data,
        error,
      } = await query;

      if (error) {
        throw error;
      }

      const normalizedSearch =
        historySearch
          .trim()
          .toLowerCase();

      const filteredRecords =
        normalizedSearch
          ? (data || []).filter(
            (record) => {
              const values = [
                record.flight_in,
                record.flight_out,
                record.bay,
                record.aircraft_type,
                record.registration,
              ];

              return values.some(
                (value) =>
                  String(
                    value || ""
                  )
                    .toLowerCase()
                    .includes(
                      normalizedSearch
                    )
              );
            }
          )
          : data || [];

      setHistoryRecords(
        filteredRecords
      );

      setStatusMessage(
        `${filteredRecords.length} checklist record(s) found`
      );
    } catch (error) {
      console.error(
        "Checklist history load failed:",
        error
      );

      setStatusMessage(
        "History load failed"
      );

      window.alert(
        "Checklist history could not be loaded.\n\n" +
        (error?.message ||
          "Unknown error")
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  function returnToChecklist() {
    setActiveView("checklist");

    setStatusMessage(
      checklistId
        ? `Returned to ${flight.flightOut ||
        "saved checklist"
        }`
        : "Checklist ready"
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
        "Your role does not have permission to create operational checklists."
      );

      return;
    }

    clearChecklistState(
      "New checklist ready"
    );
  }

  async function loadAuditHistory(
    targetChecklistId =
      checklistId
  ) {
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

      const {
        data,
        error,
      } = await supabase
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
          ].join(",")
        )
        .eq(
          "checklist_id",
          targetChecklistId
        )
        .order("created_at", {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      const userIds = [
        ...new Set(
          (data || [])
            .map(
              (record) =>
                record.user_id
            )
            .filter(Boolean)
        ),
      ];

      let profileMap =
        new Map();

      if (userIds.length > 0) {
        const {
          data: auditProfiles,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select(
            "id, full_name"
          )
          .in("id", userIds);

        if (
          !profileError &&
          auditProfiles
        ) {
          profileMap =
            new Map(
              auditProfiles.map(
                (
                  auditProfile
                ) => [
                    auditProfile.id,
                    auditProfile
                      .full_name,
                  ]
              )
            );
        }
      }

      const enrichedRecords =
        (data || []).map(
          (record) => ({
            ...record,
            user_name:
              profileMap.get(
                record.user_id
              ) || "",
          })
        );

      setAuditRecords(
        enrichedRecords
      );
    } catch (error) {
      console.error(
        "Audit history load failed:",
        error
      );

      window.alert(
        "Audit history could not be loaded.\n\n" +
        (error?.message ||
          "Unknown error")
      );
    } finally {
      setAuditLoading(false);
    }
  }

  async function openChecklist(
    checklistIdentifier
  ) {
    try {
      if (!user?.id) {
        throw new Error(
          "Please sign in again."
        );
      }

      setLoadingRecord(true);

      setStatusMessage(
        "Opening checklist..."
      );

      const {
        data: checklist,
        error: checklistError,
      } = await supabase
        .from("ramp_checklists")
        .select("*")
        .eq(
          "id",
          checklistIdentifier
        )
        .maybeSingle();

      if (checklistError) {
        throw checklistError;
      }

      if (!checklist) {
        throw new Error(
          "The selected checklist could not be found."
        );
      }

      const {
        data: savedItems,
        error: itemsError,
      } = await supabase
        .from(
          "ramp_checklist_items"
        )
        .select("*")
        .eq(
          "checklist_id",
          checklist.id
        )
        .order(
          "item_number",
          {
            ascending: true,
          }
        );

      if (itemsError) {
        throw itemsError;
      }

      setChecklistId(
        checklist.id
      );

      setRecordLocked(
        Boolean(
          checklist.is_locked
        )
      );

      setFocusedTaskNumber(null);

      setApprovalDetails({
        approvedBy:
          checklist.approved_by ||
          null,
        approvedByName: "",
        approvedAt:
          checklist.approved_at ||
          null,
        notes:
          checklist.approval_notes ||
          "",
      });

      if (
        checklist.approved_by
      ) {
        const {
          data:
          approverProfile,
          error:
          approverError,
        } = await supabase
          .from("profiles")
          .select("full_name")
          .eq(
            "id",
            checklist.approved_by
          )
          .maybeSingle();

        if (
          !approverError &&
          approverProfile
        ) {
          setApprovalDetails(
            (
              currentDetails
            ) => ({
              ...currentDetails,
              approvedByName:
                approverProfile
                  .full_name || "",
            })
          );
        }
      }

      setFlight({
        flightIn:
          checklist.flight_in ||
          "",
        flightOut:
          checklist.flight_out ||
          "",
        flightDate:
          checklist.flight_date ||
          "",
        bay:
          checklist.bay || "",
        aircraftType:
          checklist.aircraft_type ||
          "",
        registration:
          checklist.registration ||
          "",
        sta:
          normalizeDatabaseTime(
            checklist.sta
          ),
        eta:
          normalizeDatabaseTime(
            checklist.eta
          ),
        ata:
          normalizeDatabaseTime(
            checklist.ata
          ),
        chocksOn:
          normalizeDatabaseTime(
            checklist.chocks_on
          ),
        std:
          normalizeDatabaseTime(
            checklist.std
          ),
        definedPushTime:
          normalizeDatabaseTime(
            checklist.defined_push_time
          ),
        trcCoordinator:
          profile?.full_name ||
          user?.email ||
          checklist.trc_coordinator ||
          "",
      });

      const savedItemsByTaskCode =
        new Map(
          (savedItems || [])
            .filter(
              (savedItem) =>
                Boolean(
                  savedItem.task_code
                )
            )
            .map(
              (savedItem) => [
                savedItem.task_code,
                savedItem,
              ]
            )
        );

      const savedItemsByActivity =
        new Map(
          (savedItems || [])
            .filter(
              (savedItem) =>
                Boolean(
                  savedItem.activity
                )
            )
            .map(
              (savedItem) => [
                String(
                  savedItem.activity
                )
                  .trim()
                  .toLowerCase(),
                savedItem,
              ]
            )
        );

      setRows(
        CHECKLIST_ITEMS.map(
          (item) => {
            const activityKey =
              item.activity
                .trim()
                .toLowerCase();

            const savedItem =
              savedItemsByTaskCode.get(
                item.taskCode
              ) ||
              savedItemsByActivity.get(
                activityKey
              );

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
              actualTime:
                normalizeDatabaseTime(
                  savedItem.actual_time
                ),
              observation:
                savedItem.observation ||
                "",
              status:
                APPLICATION_STATUS[
                savedItem
                  .operational_status
                ] || "pending",
              delaySeconds:
                savedItem.delay_seconds,
              startedAt:
                savedItem.started_at ||
                null,
              startedBy:
                savedItem.started_by ||
                null,
            };
          }
        )
      );
      setActiveView("checklist");
      setActivePhase("All");

      if (roleCanViewAudit) {
        await loadAuditHistory(
          checklist.id
        );
      } else {
        setAuditRecords([]);
      }

      setStatusMessage(
        `Opened ${checklist.flight_out
        }`
      );
    } catch (error) {
      console.error(
        "Checklist open failed:",
        error
      );

      setStatusMessage(
        "Open failed"
      );

      window.alert(
        "The checklist could not be opened.\n\n" +
        (error?.message ||
          "Unknown error")
      );
    } finally {
      setLoadingRecord(false);
    }
  }

  async function approveChecklist(
    notes
  ) {
    try {
      if (!user?.id) {
        throw new Error(
          "Your authenticated session could not be found. Sign in again."
        );
      }

      if (!checklistId) {
        throw new Error(
          "Save the checklist before approving it."
        );
      }

      if (recordLocked) {
        throw new Error(
          "This checklist has already been approved and locked."
        );
      }

      setApproving(true);

      setStatusMessage(
        "Approving checklist..."
      );

      const {
        data,
        error,
      } = await supabase.rpc(
        "approve_ramp_checklist",
        {
          target_checklist_id:
            checklistId,
          supervisor_notes:
            notes?.trim() ||
            null,
        }
      );

      if (error) {
        throw error;
      }

      const approvedChecklist =
        Array.isArray(data)
          ? data[0]
          : data;

      if (!approvedChecklist) {
        throw new Error(
          "Supabase did not return the approved checklist."
        );
      }

      setRecordLocked(true);

      setApprovalDetails({
        approvedBy:
          approvedChecklist
            .approved_by ||
          user.id,
        approvedByName:
          profile?.full_name ||
          user.email ||
          "Authorised user",
        approvedAt:
          approvedChecklist
            .approved_at ||
          new Date()
            .toISOString(),
        notes:
          approvedChecklist
            .approval_notes ||
          notes?.trim() ||
          "",
      });

      if (roleCanViewAudit) {
        await loadAuditHistory(
          checklistId
        );
      }

      setStatusMessage(
        `Approved and locked: ${flight.flightOut
        }`
      );

      localStorage.removeItem(
        "saa_ramp_checklist_draft"
      );

      window.alert(
        "Checklist approved successfully.\n\n" +
        `Flight: ${flight.flightOut}\n` +
        "Status: Completed\n" +
        "Editing: Locked"
      );
    } catch (error) {
      console.error(
        "Checklist approval failed:",
        error
      );

      setStatusMessage(
        "Approval failed"
      );

      window.alert(
        "The checklist could not be approved.\n\n" +
        (error?.message ||
          "Unknown error")
      );
    } finally {
      setApproving(false);
    }
  }

  async function saveChecklist() {
    try {
      if (!roleCanOperate) {
        throw new Error(
          "Your role does not have permission to save operational checklists."
        );
      }

      if (recordLocked) {
        throw new Error(
          "This checklist has been approved and locked. It cannot be edited."
        );
      }

      if (!user?.id) {
        throw new Error(
          "Your authenticated user could not be found. Sign in again."
        );
      }

      if (
        !flight.flightOut.trim()
      ) {
        throw new Error(
          "Flight Out is required."
        );
      }

      if (!flight.flightDate) {
        throw new Error(
          "Flight Date is required."
        );
      }

      setSaving(true);

      setStatusMessage(
        "Saving checklist..."
      );

      const checklistRecord = {
        flight_in:
          flight.flightIn.trim() ||
          null,
        flight_out:
          flight.flightOut.trim(),
        flight_date:
          flight.flightDate,
        bay:
          flight.bay.trim() ||
          null,
        aircraft_type:
          flight.aircraftType ||
          null,
        registration:
          flight.registration
            .trim() || null,
        sta:
          flight.sta || null,
        eta:
          flight.eta || null,
        ata:
          flight.ata || null,
        chocks_on:
          flight.chocksOn ||
          null,
        std:
          flight.std || null,
        defined_push_time:
          flight.definedPushTime ||
          null,
        trc_coordinator:
          profile?.full_name ||
          user?.email ||
          flight.trcCoordinator
            .trim() ||
          null,
        checklist_status:
          metrics.done ===
            CHECKLIST_ITEMS.length
            ? "completed"
            : "in_progress",
        owner_id:
          user.id,
      };

      let activeChecklistId =
        checklistId;

      if (!activeChecklistId) {
        const {
          data,
          error,
        } = await supabase
          .from(
            "ramp_checklists"
          )
          .insert(
            checklistRecord
          )
          .select()
          .single();

        if (error) {
          throw error;
        }

        activeChecklistId =
          data.id;

        setChecklistId(
          data.id
        );
      } else {
        const updateRecord = {
          ...checklistRecord,
        };

        delete updateRecord
          .owner_id;

        const { error } =
          await supabase
            .from(
              "ramp_checklists"
            )
            .update(
              updateRecord
            )
            .eq(
              "id",
              activeChecklistId
            )
            .eq(
              "owner_id",
              user.id
            );

        if (error) {
          throw error;
        }
      }

      const itemRecords =
        CHECKLIST_ITEMS.map(
          (item, index) => {
            const row =
              rows[index];

            return {
              checklist_id:
                activeChecklistId,
              task_code:
                item.taskCode,
              item_number:
                item.itemNumber,
              phase:
                item.phase,
              activity:
                item.activity,
              base_time:
                item.base,
              planned_offset_seconds:
                item.offsetSec,
              planned_time:
                plannedTimeFor(
                  index
                ) || null,
              actual_time:
                row.actualTime ||
                null,
              delay_seconds:
                row.delaySeconds,
              operational_status:
                DATABASE_STATUS[
                row.status
                ] || "pending",
              observation:
                row.observation
                  .trim() || null,
              started_at:
                row.startedAt ||
                null,
              started_by:
                row.startedBy ||
                null,
              completed_by:
                row.status ===
                  "pending"
                  ? null
                  : user.id,
              completed_at:
                row.status ===
                  "pending"
                  ? null
                  : new Date()
                    .toISOString(),
            };
          }
        );

      const {
        error: itemError,
      } = await supabase
        .from(
          "ramp_checklist_items"
        )
        .upsert(
          itemRecords,
          {
            onConflict:
              "checklist_id,item_number",
          }
        );

      if (itemError) {
        throw itemError;
      }

      if (roleCanViewAudit) {
        await loadAuditHistory(
          activeChecklistId
        );
      }

      localStorage.setItem(
        "saa_ramp_checklist_draft",
        JSON.stringify({
          checklistId:
            activeChecklistId,
          flight,
          rows,
        })
      );

      const savedTime =
        new Date()
          .toLocaleTimeString(
            "en-ZA",
            {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            }
          );

      setStatusMessage(
        `Saved to Supabase at ${savedTime}`
      );

      window.alert(
        "OPS checklist saved successfully.\n\n" +
        `Flight: ${flight.flightOut}\n` +
        `Completed: ${metrics.done}/${CHECKLIST_ITEMS.length}`
      );
    } catch (error) {
      console.error(
        "Checklist save failed:",
        error
      );

      setStatusMessage(
        "Save failed"
      );

      window.alert(
        "The checklist could not be saved.\n\n" +
        (error?.message ||
          "Unknown error")
      );
    } finally {
      setSaving(false);
    }
  }

  const nextPendingCandidate =
    CHECKLIST_ITEMS
      .map((item, index) => {
        const row =
          rows[index];

        const plannedTime =
          plannedTimeFor(index);

        const timing =
          getPendingTaskTiming(
            plannedTime,
            operationalNow
          );

        return {
          item,
          row,
          plannedTime,
          timing,
        };
      })
      .filter(
        ({ row }) =>
          row?.status ===
          "pending"
      )
      .sort(
        compareTaskCandidates
      )[0];

  const nextTaskLabel =
    nextPendingCandidate
      ? nextPendingCandidate
        .item.activity
      : "All activities complete";

  return (
    <main className="ramp-page">
      <OperationsMenu
        open={operationsMenuOpen}
        onClose={() =>
          setOperationsMenuOpen(
            false
          )
        }
        flight={flight}
        profile={profile}
        completedCount={
          metrics.done
        }
        totalCount={
          CHECKLIST_ITEMS.length
        }
        nextTaskLabel={
          nextTaskLabel
        }
        phases={
          CHECKLIST_PHASES
        }
        activePhase={
          activePhase
        }
        onPhaseChange={
          navigateToPhase
        }
        onNavigate={
          navigateToSection
        }
        onNextTask={
          openNextPendingTask
        }
        onHistory={
          showHistory
        }
        onSave={
          saveChecklist
        }
        onReset={
          resetChecklist
        }
        onPrint={() =>
          window.print()
        }
        onExport={
          openExcelExport
        }
        onSignOut={
          handleSignOut
        }
        canSave={
          roleCanOperate
        }
        canExport={
          roleCanExport
        }
        saveDisabled={
          saving ||
          approving ||
          recordLocked
        }
        resetDisabled={
          checklistReadOnly
        }
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
            <h1>
              OPS Check-List GRU -
              Turnaround Report
            </h1>

            <p>
              PTS Turnaround Performance
              Report
            </p>
          </div>
        </div>

        <div className="ramp-header-actions">
          <div className="ramp-user">
            <strong>
              {profile?.full_name ||
                user?.email ||
                "Operational User"}
            </strong>

            <span>
              {getRoleLabel(
                profile?.role
              )}
            </span>
          </div>

          <LiveClock />

          <OperationsMenuButton
            onClick={() =>
              setOperationsMenuOpen(
                true
              )
            }
          />
        </div>
      </header>

      <section className="ramp-content">
        <div className="ramp-status-bar">
          <span
            className="status-online"
            aria-hidden="true"
          />

          {loadingRecord
            ? "Loading checklist..."
            : statusMessage}
        </div>

        {activeView ===
          "history" ? (
          <div className="history-view">
            <div className="history-navigation">
              <button
                type="button"
                className="ramp-button ramp-button-light"
                onClick={
                  returnToChecklist
                }
              >
                <ArrowLeft
                  size={17}
                  aria-hidden="true"
                />

                Back to Checklist
              </button>
            </div>

            {roleCanExport ? (
              <div id="excel-export">
                <ChecklistExport
                  profile={profile}
                />
              </div>
            ) : null}

            <ChecklistHistory
              records={
                historyRecords
              }
              loading={
                historyLoading
              }
              searchValue={
                historySearch
              }
              statusValue={
                historyStatus
              }
              onSearchChange={
                setHistorySearch
              }
              onStatusChange={
                setHistoryStatus
              }
              onRefresh={
                loadChecklistHistory
              }
              onOpen={
                openChecklist
              }
              onNew={
                createNewChecklist
              }
              canCreate={
                roleCanCreate
              }
            />
          </div>
        ) : null}

        {activeView ===
          "checklist" ? (
          <>
            {recordLocked ? (
              <div className="locked-banner">
                This checklist has been
                approved and locked. It
                is available for review
                but cannot be saved
                again.
              </div>
            ) : null}

            {!recordLocked &&
              roleIsReadOnly ? (
              <div className="readonly-banner">
                You are viewing this
                checklist in read-only
                mode as{" "}
                {getRoleLabel(
                  profile?.role
                )}
                .
              </div>
            ) : null}

            <div id="flight-information">
              <FlightInformation
                flight={flight}
                coordinatorName={
                  profile?.full_name ||
                  user?.email ||
                  ""
                }
                onChange={
                  updateFlight
                }
                onLandingNow={
                  markLandingRealNow
                }
                onChocksNow={
                  markChocksOnNow
                }
                disabled={
                  flightInformationDisabled
                }
              />
            </div>

            <div id="pushback-countdown">
              <PushbackCountdown
                chocksOn={
                  flight.chocksOn
                }
                definedPushTime={
                  flight.definedPushTime
                }
                disabled={
                  checklistReadOnly
                }
              />
            </div>

            <div id="performance-summary">
              <ChecklistMetrics
                metrics={metrics}
                totalItems={
                  CHECKLIST_ITEMS.length
                }
              />
            </div>

            <div id="approval-section">
              <ChecklistApproval
                checklistId={
                  checklistId
                }
                profile={profile}
                locked={recordLocked}
                approvalDetails={
                  approvalDetails
                }
                approving={
                  approving
                }
                onApprove={
                  approveChecklist
                }
              />
            </div>

            {checklistId &&
              roleCanViewAudit ? (
              <div id="audit-history">
                <ChecklistAuditHistory
                  records={
                    auditRecords
                  }
                  loading={
                    auditLoading
                  }
                  onRefresh={() =>
                    loadAuditHistory(
                      checklistId
                    )
                  }
                />
              </div>
            ) : null}

            <section
              id="checklist-tasks"
              className="phase-tabs"
              aria-label="Checklist phases"
            >
              {CHECKLIST_PHASES.map(
                (phase) => (
                  <button
                    key={phase}
                    type="button"
                    className={
                      activePhase ===
                        phase
                        ? "phase-tab active"
                        : "phase-tab"
                    }
                    onClick={() => {
                      setActivePhase(
                        phase
                      );

                      setFocusedTaskNumber(
                        null
                      );
                    }}
                  >
                    {phase}
                  </button>
                )
              )}
            </section>

            <section
              className="pts-task-table"
              aria-label="PTS checklist activities"
            >
              <div
                className="pts-task-header"
                role="row"
              >
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
                {visibleItems.map(
                  (item) => {
                    const index =
                      item.itemNumber -
                      1;

                    const row =
                      rows[index];

                    if (!row) {
                      return null;
                    }

                    const plannedTime =
                      plannedTimeFor(
                        index
                      );

                    const pendingTiming =
                      row.status === "pending"
                        ? getPendingTaskTiming(
                          plannedTime,
                          operationalNow
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
                        plannedTime={
                          plannedTime
                        }
                        overdue={
                          pendingTiming.overdue
                        }
                        remainingSeconds={
                          pendingTiming.remainingSeconds
                        }
                        timingLabel={
                          pendingTiming.label
                        }
                        onObservationChange={(value) => {
                          updateObservation(
                            item.itemNumber,
                            value
                          );
                        }}
                        onStart={() => {
                          startActivity(
                            item.itemNumber
                          );
                        }}
                        onMark={() => {
                          markActivity(
                            item.itemNumber
                          );
                        }}
                        observationDisabled={
                          observationsDisabled
                        }
                        completeDisabled={
                          taskCompletionDisabled
                        }
                        canUndo={
                          roleCanUndoTask
                        }
                      />
                    );
                  }
                )}
              </div>
            </section>


          </>
        ) : null}
      </section>
    </main>
  );
}