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

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(value));
}

function getActionLabel(action) {
  const labels = {
    created: "Checklist Created",
    updated: "Checklist Updated",
    approved_and_locked:
      "Approved and Locked",
  };

  return labels[action] || action || "Activity";
}

function getActionClass(action) {
  const classes = {
    created:
      "audit-action audit-action-created",
    updated:
      "audit-action audit-action-updated",
    approved_and_locked:
      "audit-action audit-action-approved",
  };

  return (
    classes[action] ||
    "audit-action audit-action-updated"
  );
}

function formatFieldName(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) =>
      character.toUpperCase()
    );
}

function formatValue(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Not entered";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function findChanges(oldValues, newValues) {
  const previous = oldValues || {};
  const current = newValues || {};

  const ignoredFields = new Set([
    "updated_at",
    "created_at",
  ]);

  const allFields = new Set([
    ...Object.keys(previous),
    ...Object.keys(current),
  ]);

  return [...allFields]
    .filter(
      (field) => !ignoredFields.has(field)
    )
    .filter((field) => {
      return (
        JSON.stringify(previous[field]) !==
        JSON.stringify(current[field])
      );
    })
    .map((field) => ({
      field,
      oldValue: previous[field],
      newValue: current[field],
    }));
}

export default function ChecklistAuditHistory({
  records,
  loading,
  onRefresh,
}) {
  const [expandedRecords, setExpandedRecords] =
    useState(() => new Set());

  const normalizedRecords = useMemo(() => {
    return (records || []).map((record) => ({
      ...record,
      changes: findChanges(
        record.old_values,
        record.new_values
      ),
    }));
  }, [records]);

  function toggleRecord(recordId) {
    setExpandedRecords((currentRecords) => {
      const updatedRecords = new Set(
        currentRecords
      );

      if (updatedRecords.has(recordId)) {
        updatedRecords.delete(recordId);
      } else {
        updatedRecords.add(recordId);
      }

      return updatedRecords;
    });
  }

  return (
    <section className="audit-panel">
      <div className="audit-heading">
        <div>
          <p className="ramp-eyebrow">
            Record governance
          </p>

          <h3>Audit history</h3>

          <p>
            Review checklist creation, updates,
            approval, and locking activity.
          </p>
        </div>

        <button
          type="button"
          className="ramp-button ramp-button-light"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? (
            <LoaderCircle
              size={17}
              className="spin"
            />
          ) : (
            <RefreshCw size={17} />
          )}

          Refresh Audit
        </button>
      </div>

      {loading ? (
        <div className="audit-empty">
          <LoaderCircle
            size={28}
            className="spin"
          />

          <strong>
            Loading audit history
          </strong>
        </div>
      ) : null}

      {!loading &&
      normalizedRecords.length === 0 ? (
        <div className="audit-empty">
          <ClipboardClock size={30} />

          <strong>
            No audit records available
          </strong>

          <span>
            Audit entries will appear after the
            checklist is created or updated.
          </span>
        </div>
      ) : null}

      {!loading &&
      normalizedRecords.length > 0 ? (
        <div className="audit-list">
          {normalizedRecords.map((record) => {
            const expanded =
              expandedRecords.has(record.id);

            return (
              <article
                className="audit-record"
                key={record.id}
              >
                <button
                  type="button"
                  className="audit-record-summary"
                  onClick={() =>
                    toggleRecord(record.id)
                  }
                >
                  <div>
                    <span
                      className={getActionClass(
                        record.action
                      )}
                    >
                      {getActionLabel(
                        record.action
                      )}
                    </span>

                    <strong>
                      {record.user_name ||
                        record.user_email ||
                        "Authenticated user"}
                    </strong>

                    <small>
                      {formatAuditTime(
                        record.created_at
                      )}
                    </small>
                  </div>

                  <div className="audit-summary-end">
                    <span>
                      {record.changes.length} change
                      {record.changes.length === 1
                        ? ""
                        : "s"}
                    </span>

                    {expanded ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </div>
                </button>

                {expanded ? (
                  <div className="audit-changes">
                    {record.changes.length > 0 ? (
                      record.changes.map((change) => (
                        <div
                          className="audit-change"
                          key={change.field}
                        >
                          <strong>
                            {formatFieldName(
                              change.field
                            )}
                          </strong>

                          <div>
                            <span>Previous</span>

                            <p>
                              {formatValue(
                                change.oldValue
                              )}
                            </p>
                          </div>

                          <div>
                            <span>New</span>

                            <p>
                              {formatValue(
                                change.newValue
                              )}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="audit-no-changes">
                        No field-level changes were
                        recorded for this event.
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