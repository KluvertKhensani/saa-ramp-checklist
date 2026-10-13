import {
  ChevronRight,
  FilePlus2,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Search,
} from "lucide-react";
import { useState } from "react";

function formatFlightDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(parsedDate);
}

function formatUpdatedTime(value) {
  if (!value) {
    return "Update time unavailable";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Update time unavailable";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(parsedDate);
}

function getStatusLabel(status) {
  const labels = {
    draft: "Draft",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return labels[status] || "Draft";
}

function getStatusClass(status) {
  const classes = {
    draft: "history-status history-status-draft",
    in_progress: "history-status history-status-active",
    completed: "history-status history-status-completed",
    cancelled: "history-status history-status-cancelled",
  };

  return classes[status] || classes.draft;
}

export default function ChecklistHistory({
  records = [],
  loading = false,
  searchValue = "",
  statusValue = "all",
  onSearchChange,
  onStatusChange,
  onRefresh,
  onOpen,
  onNew,
  canCreate = false,
}) {
  const [openingRecordId, setOpeningRecordId] = useState(null);

  async function handleOpen(recordId) {
    if (loading || openingRecordId !== null) {
      return;
    }

    try {
      setOpeningRecordId(recordId);

      await onOpen?.(recordId);
    } finally {
      setOpeningRecordId(null);
    }
  }

  function handleSearchChange(event) {
    onSearchChange?.(event.target.value);
  }

  function handleStatusChange(event) {
    onStatusChange?.(event.target.value);
  }

  const hasActiveFilters =
    Boolean(searchValue?.trim()) || statusValue !== "all";

  return (
    <section className="history-panel" aria-busy={loading}>
      <div className="history-heading">
        <div>
          <p className="ramp-eyebrow">Operational records</p>

          <h2>Checklist history</h2>

          <p>Search, review, and continue saved turnaround checklists.</p>
        </div>

        <div className="history-heading-actions">
          <button
            type="button"
            className="ramp-button ramp-button-light"
            onClick={onRefresh}
            disabled={loading || openingRecordId !== null}
            aria-label={
              loading
                ? "Refreshing checklist history"
                : "Refresh checklist history"
            }
          >
            {loading ? (
              <LoaderCircle size={17} className="spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={17} aria-hidden="true" />
            )}

            {loading ? "Refreshing..." : "Refresh"}
          </button>

          {canCreate ? (
            <button
              type="button"
              className="ramp-button ramp-button-gold"
              onClick={onNew}
              disabled={loading || openingRecordId !== null}
            >
              <FilePlus2 size={17} aria-hidden="true" />
              New Checklist
            </button>
          ) : null}
        </div>
      </div>

      <div className="history-filters">
        <label className="history-search">
          <Search size={18} aria-hidden="true" />

          <input
            type="search"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search flight, registration, aircraft or bay"
            disabled={loading || openingRecordId !== null}
            autoComplete="off"
            spellCheck={false}
            aria-label="Search checklist history"
          />
        </label>

        <select
          value={statusValue}
          onChange={handleStatusChange}
          disabled={loading || openingRecordId !== null}
          aria-label="Filter checklists by status"
        >
          <option value="all">All statuses</option>

          <option value="draft">Draft</option>

          <option value="in_progress">In Progress</option>

          <option value="completed">Completed</option>

          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {!loading ? (
        <div
          className="history-result-summary"
          role="status"
          aria-live="polite"
        >
          <span>
            {records.length} {records.length === 1 ? "checklist" : "checklists"}
          </span>

          {hasActiveFilters ? <small>Filtered results</small> : null}
        </div>
      ) : null}

      {loading ? (
        <div className="history-empty">
          <LoaderCircle size={30} className="spin" aria-hidden="true" />

          <strong>Loading checklists</strong>

          <span>Retrieving operational records.</span>
        </div>
      ) : null}

      {!loading && records.length === 0 ? (
        <div className="history-empty">
          <Search size={30} aria-hidden="true" />

          <strong>No matching checklists</strong>

          <span>
            {hasActiveFilters
              ? "Adjust the search or status filter."
              : canCreate
                ? "Create a new checklist to begin an operational record."
                : "No checklist records are available for this account."}
          </span>
        </div>
      ) : null}

      {!loading && records.length > 0 ? (
        <div className="history-list">
          {records.map((record) => {
            const opening = openingRecordId === record.id;

            return (
              <button
                type="button"
                className="history-record"
                key={record.id}
                onClick={() => handleOpen(record.id)}
                disabled={openingRecordId !== null}
                aria-busy={opening}
                aria-label={`Open checklist for ${
                  record.flight_out || "unnamed flight"
                }`}
              >
                <div className="history-flight">
                  <strong>{record.flight_out || "Flight not entered"}</strong>

                  <span>
                    {record.flight_in
                      ? `Inbound ${record.flight_in}`
                      : "No inbound flight"}
                  </span>
                </div>

                <div className="history-details">
                  <span>{formatFlightDate(record.flight_date)}</span>

                  <span>Bay: {record.bay || "Not entered"}</span>

                  <span>Aircraft: {record.aircraft_type || "Not entered"}</span>

                  <span>
                    Registration: {record.registration || "Not entered"}
                  </span>
                </div>

                <div className="history-record-end">
                  <span className={getStatusClass(record.checklist_status)}>
                    {getStatusLabel(record.checklist_status)}
                  </span>

                  {record.is_locked ? (
                    <span className="history-lock-status">
                      <LockKeyhole size={13} aria-hidden="true" />
                      Locked
                    </span>
                  ) : null}

                  <small>Updated {formatUpdatedTime(record.updated_at)}</small>

                  {opening ? (
                    <LoaderCircle
                      size={18}
                      className="spin"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronRight size={18} aria-hidden="true" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
