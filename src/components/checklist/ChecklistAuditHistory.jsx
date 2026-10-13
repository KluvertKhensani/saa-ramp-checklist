import {
  ChevronDown,
  ChevronUp,
  ClipboardClock,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";

function formatAuditTime(value) {
  if (!value) {
    return "Time unavailable";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Time unavailable";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(parsedDate);
}

function getActionLabel(action) {
  const labels = {
    created: "Checklist Created",
    updated: "Checklist Updated",
    task_started: "Task Started",
    task_completed: "Task Completed",
    task_undone: "Task Returned to Pending",
    approved: "Checklist Approved",
    approved_and_locked: "Approved and Locked",
    locked: "Checklist Locked",
  };

  if (labels[action]) {
    return labels[action];
  }

  return String(action || "Activity")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getActionClass(action) {
  const classes = {
    created: "audit-action audit-action-created",
    updated: "audit-action audit-action-updated",
    task_started: "audit-action audit-action-created",
    task_completed: "audit-action audit-action-approved",
    task_undone: "audit-action audit-action-undone",
    approved: "audit-action audit-action-approved",
    approved_and_locked: "audit-action audit-action-approved",
    locked: "audit-action audit-action-approved",
  };

  return classes[action] || "audit-action audit-action-updated";
}

function getEntityLabel(entityType) {
  const labels = {
    ramp_checklist: "Checklist",
    ramp_checklist_item: "Checklist Task",
    checklist: "Checklist",
    task: "Checklist Task",
  };

  return (
    labels[entityType] ||
    String(entityType || "Record")
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function formatFieldName(value) {
  const labels = {
    task_code: "Task Code",
    item_number: "Task Number",
    operational_status: "Operational Status",
    actual_time: "Actual Time",
    delay_seconds: "Delay Seconds",
    started_at: "Started At",
    started_by: "Started By",
    completed_at: "Completed At",
    completed_by: "Completed By",
    checklist_status: "Checklist Status",
    approval_notes: "Approval Notes",
    approved_at: "Approved At",
    approved_by: "Approved By",
    is_locked: "Locked",
  };

  if (labels[value]) {
    return labels[value];
  }

  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatStatusValue(value) {
  const labels = {
    pending: "Pending",
    on_time: "On Time",
    light_delay: "Slightly Delayed",
    delay: "Delayed",
    draft: "Draft",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return labels[value] || value;
}

function formatValue(value, field) {
  if (value === null || value === undefined || value === "") {
    return "Not entered";
  }

  if (field === "operational_status" || field === "checklist_status") {
    return formatStatusValue(value);
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (
    field === "started_at" ||
    field === "completed_at" ||
    field === "approved_at" ||
    field === "locked_at"
  ) {
    return formatAuditTime(value);
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

function findChanges(oldValues, newValues) {
  const previous = oldValues || {};

  const current = newValues || {};

  const ignoredFields = new Set(["updated_at", "created_at"]);

  const allFields = new Set([
    ...Object.keys(previous),
    ...Object.keys(current),
  ]);

  return [...allFields]
    .filter((field) => !ignoredFields.has(field))
    .filter(
      (field) =>
        JSON.stringify(previous[field]) !== JSON.stringify(current[field]),
    )
    .map((field) => ({
      field,
      oldValue: previous[field],
      newValue: current[field],
    }));
}

function getRecordDescription(record) {
  const taskCode = record.new_values?.task_code || record.old_values?.task_code;

  const itemNumber =
    record.new_values?.item_number || record.old_values?.item_number;

  if (taskCode && itemNumber) {
    return `Task ${itemNumber} · ${taskCode}`;
  }

  if (taskCode) {
    return `Task ${taskCode}`;
  }

  return getEntityLabel(record.entity_type);
}

export default function ChecklistAuditHistory({
  records = [],
  loading = false,
  onRefresh,
}) {
  const [expandedRecords, setExpandedRecords] = useState(() => new Set());

  const normalizedRecords = useMemo(() => {
    return records.map((record) => ({
      ...record,
      changes: findChanges(record.old_values, record.new_values),
      description: getRecordDescription(record),
    }));
  }, [records]);

  function toggleRecord(recordId) {
    setExpandedRecords((currentRecords) => {
      const updatedRecords = new Set(currentRecords);

      if (updatedRecords.has(recordId)) {
        updatedRecords.delete(recordId);
      } else {
        updatedRecords.add(recordId);
      }

      return updatedRecords;
    });
  }

  return (
    <section className="audit-panel" aria-busy={loading}>
      <div className="audit-heading">
        <div>
          <p className="ramp-eyebrow">Record governance</p>

          <h3>Audit history</h3>

          <p>
            Review checklist creation, task lifecycle, approval, and locking
            activity.
          </p>
        </div>

        <button
          type="button"
          className="ramp-button ramp-button-light"
          onClick={onRefresh}
          disabled={loading}
          aria-label={
            loading ? "Refreshing audit history" : "Refresh audit history"
          }
        >
          {loading ? (
            <LoaderCircle size={17} className="spin" aria-hidden="true" />
          ) : (
            <RefreshCw size={17} aria-hidden="true" />
          )}

          {loading ? "Refreshing..." : "Refresh Audit"}
        </button>
      </div>

      {!loading ? (
        <div className="audit-result-summary" role="status" aria-live="polite">
          {normalizedRecords.length}{" "}
          {normalizedRecords.length === 1 ? "audit event" : "audit events"}
        </div>
      ) : null}

      {loading ? (
        <div className="audit-empty">
          <LoaderCircle size={28} className="spin" aria-hidden="true" />

          <strong>Loading audit history</strong>

          <span>Retrieving governance and lifecycle events.</span>
        </div>
      ) : null}

      {!loading && normalizedRecords.length === 0 ? (
        <div className="audit-empty">
          <ClipboardClock size={30} aria-hidden="true" />

          <strong>No audit records available</strong>

          <span>
            Audit entries will appear after supported checklist or task actions
            are recorded.
          </span>
        </div>
      ) : null}

      {!loading && normalizedRecords.length > 0 ? (
        <div className="audit-list">
          {normalizedRecords.map((record) => {
            const expanded = expandedRecords.has(record.id);

            const detailId = `audit-detail-${record.id}`;

            return (
              <article className="audit-record" key={record.id}>
                <button
                  type="button"
                  className="audit-record-summary"
                  onClick={() => toggleRecord(record.id)}
                  aria-expanded={expanded}
                  aria-controls={detailId}
                >
                  <div>
                    <span className={getActionClass(record.action)}>
                      {getActionLabel(record.action)}
                    </span>

                    <strong>
                      {record.user_name ||
                        record.user_email ||
                        "Authenticated user"}
                    </strong>

                    <small>
                      {record.description}
                      {" · "}
                      {formatAuditTime(record.created_at)}
                    </small>
                  </div>

                  <div className="audit-summary-end">
                    <span>
                      {record.changes.length} change
                      {record.changes.length === 1 ? "" : "s"}
                    </span>

                    {expanded ? (
                      <ChevronUp size={18} aria-hidden="true" />
                    ) : (
                      <ChevronDown size={18} aria-hidden="true" />
                    )}
                  </div>
                </button>

                {expanded ? (
                  <div id={detailId} className="audit-changes">
                    {record.changes.length > 0 ? (
                      record.changes.map((change) => (
                        <div className="audit-change" key={change.field}>
                          <strong>{formatFieldName(change.field)}</strong>

                          <div>
                            <span>Previous</span>

                            <p>{formatValue(change.oldValue, change.field)}</p>
                          </div>

                          <div>
                            <span>New</span>

                            <p>{formatValue(change.newValue, change.field)}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="audit-no-changes">
                        No field-level changes were recorded for this event.
                      </p>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
