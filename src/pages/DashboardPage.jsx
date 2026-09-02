import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  History,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Save,
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
  normalizeDatabaseTime,
  secondsToTime,
  timeToSeconds,
} from "../utils/checklistTime";
import {
  canCreateChecklist,
  canExportReports,
  canOperateChecklist,
  canViewAuditHistory,
  getRoleLabel,
  isReadOnlyRole,
} from "../utils/roles";

const EMPTY_FLIGHT = {
  flightIn: "",
  flightOut: "",
  flightDate: new Date().toISOString().slice(0, 10),
  bay: "",
  aircraftType: "",
  registration: "",
  sta: "",
  eta: "",
  ata: "",
  chocksOn: "",
  std: "",
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

export default function DashboardPage() {
  const { user, profile, signOut } = useAuth();

  const [flight, setFlight] = useState({
    ...EMPTY_FLIGHT,
    trcCoordinator: profile?.full_name || "",
  });

  const [rows, setRows] = useState(
    createEmptyChecklistRows
  );

  const [activePhase, setActivePhase] =
    useState("All");

  const [checklistId, setChecklistId] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  const [loadingRecord, setLoadingRecord] =
    useState(false);

  const [statusMessage, setStatusMessage] =
    useState("Not saved");

  const [activeView, setActiveView] =
    useState("checklist");

  const [historyRecords, setHistoryRecords] =
    useState([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [historySearch, setHistorySearch] =
    useState("");

  const [historyStatus, setHistoryStatus] =
    useState("all");

  const [recordLocked, setRecordLocked] =
    useState(false);

  const [approving, setApproving] =
    useState(false);

  const [
    approvalDetails,
    setApprovalDetails,
  ] = useState(EMPTY_APPROVAL_DETAILS);

  const [auditRecords, setAuditRecords] =
    useState([]);

  const [auditLoading, setAuditLoading] =
    useState(false);

  const roleCanCreate =
    canCreateChecklist(profile?.role);

  const roleCanOperate =
    canOperateChecklist(profile?.role);

  const roleCanViewAudit =
    canViewAuditHistory(profile?.role);

  const roleCanExport =
    canExportReports(profile?.role);

  const roleIsReadOnly =
    isReadOnlyRole(profile?.role);

  const checklistReadOnly =
    recordLocked ||
    approving ||
    roleIsReadOnly ||
    !roleCanOperate;

  function plannedTimeFor(index) {
    const item = CHECKLIST_ITEMS[index];

    if (!item) {
      return "";
    }

    const baseSeconds =
      item.base === "std"
        ? timeToSeconds(flight.std)
        : timeToSeconds(flight.chocksOn);

    if (baseSeconds === null) {
      return "";
    }

    return secondsToTime(
      baseSeconds + item.offsetSec
    );
  }

  const metrics = useMemo(() => {
    return rows.reduce(
      (totals, row) => {
        if (row.status !== "pending") {
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

  const visibleItems = useMemo(() => {
    if (activePhase === "All") {
      return CHECKLIST_ITEMS;
    }

    return CHECKLIST_ITEMS.filter(
      (item) =>
        item.phase === activePhase
    );
  }, [activePhase]);

  function updateFlight(field, value) {
    if (checklistReadOnly) {
      return;
    }

    setFlight((currentFlight) => {
      const updatedFlight = {
        ...currentFlight,
      };

      Reflect.set(
        updatedFlight,
        field,
        value
      );

      return updatedFlight;
    });

    setStatusMessage("Not saved");
  }

  function updateRow(itemNumber, changes) {
    if (checklistReadOnly) {
      return;
    }

    const index = itemNumber - 1;

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

    setStatusMessage("Not saved");
  }

  function markActivity(itemNumber) {
    if (checklistReadOnly) {
      window.alert(
        "This checklist is read-only for your current role or has already been locked."
      );

      return;
    }

    const index = itemNumber - 1;
    const row = rows[index];

    if (!row) {
      return;
    }

    if (row.status !== "pending") {
      updateRow(itemNumber, {
        actualTime: "",
        status: "pending",
        delaySeconds: null,
      });

      return;
    }

    const actualTime = currentTime();
    const plannedTime =
      plannedTimeFor(index);

    const delaySeconds =
      calculateDelaySeconds(
        actualTime,
        plannedTime
      );

    updateRow(itemNumber, {
      actualTime,
      delaySeconds,
      status:
        plannedTime &&
        delaySeconds !== null
          ? classifyDelay(delaySeconds)
          : "ontime",
    });
  }

  function markChocksOnNow() {
    if (checklistReadOnly) {
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

  async function handleSignOut() {
    const { error } = await signOut();

    if (error) {
      window.alert(
        `Sign out failed: ${error.message}`
      );
    }
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

    setFlight({
      ...EMPTY_FLIGHT,
      flightDate:
        new Date()
          .toISOString()
          .slice(0, 10),
      trcCoordinator:
        profile?.full_name || "",
    });

    setRows(
      createEmptyChecklistRows()
    );

    setActivePhase("All");
    setChecklistId(null);
    setRecordLocked(false);

    setApprovalDetails({
      ...EMPTY_APPROVAL_DETAILS,
    });

    setAuditRecords([]);
    setStatusMessage("Not saved");

    localStorage.removeItem(
      "saa_ramp_checklist_draft"
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

      if (
        !roleCanViewAudit &&
        profile?.role !==
          "turnaround_coordinator" &&
        profile?.role !==
          "trc_coordinator"
      ) {
        query = query.eq(
          "owner_id",
          user.id
        );
      }

      if (historyStatus !== "all") {
        query = query.eq(
          "checklist_status",
          historyStatus
        );
      }

      const { data, error } =
        await query;

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
                    String(value || "")
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
        ? `Returned to ${
            flight.flightOut ||
            "saved checklist"
          }`
        : "Checklist ready"
    );
  }

  async function showHistory() {
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

    setFlight({
      ...EMPTY_FLIGHT,
      flightDate:
        new Date()
          .toISOString()
          .slice(0, 10),
      trcCoordinator:
        profile?.full_name || "",
    });

    setRows(
      createEmptyChecklistRows()
    );

    setChecklistId(null);
    setRecordLocked(false);

    setApprovalDetails({
      ...EMPTY_APPROVAL_DETAILS,
    });

    setAuditRecords([]);
    setActivePhase("All");

    setStatusMessage(
      "New checklist ready"
    );

    setActiveView("checklist");

    localStorage.removeItem(
      "saa_ramp_checklist_draft"
    );
  }

  async function loadAuditHistory(
    targetChecklistId = checklistId
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

      const { data, error } =
        await supabase
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
          profileMap = new Map(
            auditProfiles.map(
              (auditProfile) => [
                auditProfile.id,
                auditProfile.full_name,
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
        .order("item_number", {
          ascending: true,
        });

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

      if (checklist.approved_by) {
        const {
          data: approverProfile,
          error: approverError,
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
            (currentDetails) => ({
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
        trcCoordinator:
          checklist.trc_coordinator ||
          "",
      });

      const itemMap = new Map(
        (savedItems || []).map(
          (item) => [
            item.item_number,
            item,
          ]
        )
      );

      setRows(
        CHECKLIST_ITEMS.map(
          (item) => {
            const savedItem =
              itemMap.get(
                item.itemNumber
              );

            if (!savedItem) {
              return {
                actualTime: "",
                observation: "",
                status: "pending",
                delaySeconds: null,
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
                savedItem
                  .delay_seconds,
            };
          }
        )
      );

      setActiveView("checklist");

      if (roleCanViewAudit) {
        await loadAuditHistory(
          checklist.id
        );
      } else {
        setAuditRecords([]);
      }

      setStatusMessage(
        `Opened ${checklist.flight_out}`
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

      const { data, error } =
        await supabase.rpc(
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
          new Date().toISOString(),
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
        `Approved and locked: ${flight.flightOut}`
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
        trc_coordinator:
          flight.trcCoordinator
            .trim() || null,
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

        delete updateRecord.owner_id;

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
        "Ramp checklist saved successfully.\n\n" +
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

  return (
    <main className="ramp-page">
      <header className="ramp-header">
        <div className="ramp-brand">
          <div className="ramp-brand-logo">
            <AppLogo
              className="saa-app-logo"
              alt="SAA GRU Turnaround Operations"
            />
          </div>

          <div>
            <h1>
              SAA GRU Turnaround Operations
            </h1>

            <p>
              Mobile Operational Checklist
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

          <button
            type="button"
            className="ramp-button ramp-button-light"
            onClick={showHistory}
            disabled={
              historyLoading ||
              approving
            }
          >
            {historyLoading ? (
              <LoaderCircle
                size={17}
                className="spin"
              />
            ) : (
              <History
                size={17}
              />
            )}

            History
          </button>

          {activeView ===
            "checklist" &&
          roleCanOperate ? (
            <button
              type="button"
              className="ramp-button ramp-button-gold"
              onClick={saveChecklist}
              disabled={
                saving ||
                approving ||
                recordLocked
              }
            >
              {saving ? (
                <LoaderCircle
                  size={17}
                  className="spin"
                />
              ) : (
                <Save
                  size={17}
                />
              )}

              {saving
                ? "Saving..."
                : "Save"}
            </button>
          ) : null}

          <button
            type="button"
            className="ramp-button ramp-button-light"
            onClick={handleSignOut}
          >
            <LogOut
              size={17}
            />

            Sign out
          </button>
        </div>
      </header>

      <section className="ramp-content">
        <div className="ramp-status-bar">
          <span className="status-online" />

          {loadingRecord
            ? "Loading checklist..."
            : statusMessage}
        </div>

        {activeView === "history" ? (
          <div className="history-view">
            <div className="history-navigation">
              <button
                type="button"
                className="ramp-button ramp-button-light"
                onClick={returnToChecklist}
              >
                <ArrowLeft
                  size={17}
                  aria-hidden="true"
                />

                Back to Checklist
              </button>
            </div>

            {roleCanExport ? (
              <ChecklistExport
                profile={profile}
              />
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

        {activeView ===
        "checklist" ? (
          <>
            {recordLocked ? (
              <div className="locked-banner">
                This checklist has
                been approved and
                locked. It is available
                for review but cannot
                be saved again.
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

            <FlightInformation
              flight={flight}
              onChange={updateFlight}
              onChocksNow={
                markChocksOnNow
              }
              disabled={
                checklistReadOnly
              }
            />

            <ChecklistMetrics
              metrics={metrics}
              totalItems={
                CHECKLIST_ITEMS.length
              }
            />

            <ChecklistApproval
              checklistId={
                checklistId
              }
              profile={profile}
              locked={recordLocked}
              approvalDetails={
                approvalDetails
              }
              approving={approving}
              onApprove={
                approveChecklist
              }
            />

            {checklistId &&
            roleCanViewAudit ? (
              <ChecklistAuditHistory
                records={auditRecords}
                loading={auditLoading}
                onRefresh={() =>
                  loadAuditHistory(
                    checklistId
                  )
                }
              />
            ) : null}

            <section className="phase-tabs">
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
                    onClick={() =>
                      setActivePhase(
                        phase
                      )
                    }
                  >
                    {phase}
                  </button>
                )
              )}
            </section>

            <section className="checklist-list">
              {visibleItems.map(
                (item) => {
                  const index =
                    item.itemNumber -
                    1;

                  const row =
                    rows[index];

                  return (
                    <ChecklistActivity
                      key={
                        item.itemNumber
                      }
                      item={item}
                      row={row}
                      plannedTime={plannedTimeFor(
                        index
                      )}
                      onObservationChange={(
                        value
                      ) =>
                        updateRow(
                          item.itemNumber,
                          {
                            observation:
                              value,
                          }
                        )
                      }
                      onMark={() =>
                        markActivity(
                          item.itemNumber
                        )
                      }
                      disabled={
                        checklistReadOnly
                      }
                    />
                  );
                }
              )}
            </section>

            <section className="bottom-actions">
              <button
                type="button"
                className="ramp-button ramp-button-light"
                onClick={showHistory}
                disabled={
                  historyLoading ||
                  approving
                }
              >
                <History
                  size={17}
                />

                History
              </button>

              <button
                type="button"
                className="ramp-button ramp-button-light"
                onClick={
                  resetChecklist
                }
                disabled={
                  checklistReadOnly
                }
              >
                <RefreshCw
                  size={17}
                />

                Reset
              </button>

              <button
                type="button"
                className="ramp-button ramp-button-light"
                onClick={() =>
                  window.print()
                }
              >
                <Download
                  size={17}
                />

                PDF
              </button>

              {roleCanOperate ? (
                <button
                  type="button"
                  className="ramp-button ramp-button-gold"
                  onClick={
                    saveChecklist
                  }
                  disabled={
                    saving ||
                    approving ||
                    recordLocked
                  }
                >
                  {saving ? (
                    <LoaderCircle
                      size={17}
                      className="spin"
                    />
                  ) : (
                    <Save
                      size={17}
                    />
                  )}

                  {saving
                    ? "Saving..."
                    : "Save Checklist"}
                </button>
              ) : null}
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}