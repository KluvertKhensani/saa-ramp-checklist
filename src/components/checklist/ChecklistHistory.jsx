import {
  ChevronRight,
  FilePlus2,
  LoaderCircle,
  RefreshCw,
  Search,
} from "lucide-react";

function formatFlightDate(value) {
  if (!value) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
}

function formatUpdatedTime(value) {
  if (!value) {
    return "Update time unavailable";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
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
  records,
  loading,
  searchValue,
  statusValue,
  onSearchChange,
  onStatusChange,
  onRefresh,
  onOpen,
  onNew,
}) {
  return (
    <section className="history-panel">
      <div className="history-heading">
        <div>
          <p className="ramp-eyebrow">Operational records</p>
          <h2>Checklist history</h2>
          <p>
            Search, review, and continue saved turnaround checklists.
          </p>
        </div>

        <div className="history-heading-actions">
          <button
            type="button"
            className="ramp-button ramp-button-light"
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <RefreshCw size={17} />
            )}

            Refresh
          </button>

          <button
            type="button"
            className="ramp-button ramp-button-gold"
            onClick={onNew}
          >
            <FilePlus2 size={17} />
            New Checklist
          </button>
        </div>
      </div>

      <div className="history-filters">
        <label className="history-search">
          <Search size={18} />

          <input
            value={searchValue}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search flight, registration, aircraft or bay"
          />
        </label>

        <select
          value={statusValue}
          onChange={(event) =>
            onStatusChange(event.target.value)
          }
          aria-label="Filter checklists by status"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="history-empty">
          <LoaderCircle size={30} className="spin" />
          <strong>Loading checklists</strong>
        </div>
      ) : null}

      {!loading && records.length === 0 ? (
        <div className="history-empty">
          <Search size={30} />
          <strong>No matching checklists</strong>
          <span>
            Adjust the search filters or create a new checklist.
          </span>
        </div>
      ) : null}

      {!loading && records.length > 0 ? (
        <div className="history-list">
          {records.map((record) => (
            <button
              type="button"
              className="history-record"
              key={record.id}
              onClick={() => onOpen(record.id)}
            >
              <div className="history-flight">
                <strong>
                  {record.flight_out || "Flight not entered"}
                </strong>

                <span>
                  {record.flight_in
                    ? `Inbound ${record.flight_in}`
                    : "No inbound flight"}
                </span>
              </div>

              <div className="history-details">
                <span>{formatFlightDate(record.flight_date)}</span>
                <span>Bay: {record.bay || "Not entered"}</span>
                <span>
                  Aircraft: {record.aircraft_type || "Not entered"}
                </span>
                <span>
                  Registration: {record.registration || "Not entered"}
                </span>
              </div>

              <div className="history-record-end">
                <span
                  className={getStatusClass(
                    record.checklist_status
                  )}
                >
                  {getStatusLabel(record.checklist_status)}
                </span>

                {record.is_locked ? (
                  <span className="history-lock-status">
                    Locked
                  </span>
                ) : null}

                <small>
                  Updated {formatUpdatedTime(record.updated_at)}
                </small>

                <ChevronRight size={18} />
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}