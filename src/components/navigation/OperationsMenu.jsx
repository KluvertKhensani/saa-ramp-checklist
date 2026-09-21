import {
  BarChart3,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Download,
  FileSpreadsheet,
  History,
  ListChecks,
  LogOut,
  Menu,
  Plane,
  RefreshCw,
  Save,
  ShieldCheck,
  X,
} from "lucide-react";

const NAVIGATION_ITEMS = [
  {
    id: "flight-information",
    label: "Flight Information",
    icon: Plane,
  },
  {
    id: "pushback-countdown",
    label: "Pushback Countdown",
    icon: Clock3,
  },
  {
    id: "performance-summary",
    label: "Performance Summary",
    icon: BarChart3,
  },
  {
    id: "checklist-tasks",
    label: "Checklist Activities",
    icon: ListChecks,
  },
  {
    id: "approval-section",
    label: "Approval",
    icon: ShieldCheck,
  },
  {
    id: "audit-history",
    label: "Audit History",
    icon: History,
  },
];

function MenuButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  danger = false,
}) {
  return (
    <button
      type="button"
      className={
        danger
          ? "operations-menu-item operations-menu-item-danger"
          : "operations-menu-item"
      }
      onClick={onClick}
      disabled={disabled}
    >
      <Icon
        size={18}
        aria-hidden="true"
      />

      <span>{label}</span>

      <ChevronRight
        size={17}
        aria-hidden="true"
      />
    </button>
  );
}

export default function OperationsMenu({
  open,
  onClose,
  flight,
  profile,
  completedCount,
  totalCount,
  nextTaskLabel,
  phases,
  activePhase,
  onPhaseChange,
  onNavigate,
  onNextTask,
  onHistory,
  onSave,
  onReset,
  onPrint,
  onExport,
  onSignOut,
  canSave = false,
  canExport = false,
  saveDisabled = false,
  resetDisabled = false,
}) {
  if (!open) {
    return null;
  }

  function handleNavigation(
    sectionId
  ) {
    onNavigate(sectionId);
    onClose();
  }

  function handlePhaseChange(
    phase
  ) {
    onPhaseChange(phase);
    onClose();
  }

  function handleAction(action) {
    action();
    onClose();
  }

  return (
    <div
      className="operations-menu-layer"
      role="presentation"
    >
      <button
        type="button"
        className="operations-menu-backdrop"
        onClick={onClose}
        aria-label="Close operations menu"
      />

      <aside
        className="operations-menu"
        aria-label="Operations navigation"
      >
        <header className="operations-menu-header">
          <div>
            <p className="ramp-eyebrow">
              OPS GRU
            </p>

            <h2>
              Operations Menu
            </h2>
          </div>

          <button
            type="button"
            className="operations-menu-close"
            onClick={onClose}
            aria-label="Close operations menu"
          >
            <X
              size={22}
              aria-hidden="true"
            />
          </button>
        </header>

        <section className="operations-menu-summary">
          <div>
            <span>Flight Out</span>

            <strong>
              {flight.flightOut ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Bay</span>

            <strong>
              {flight.bay ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Chocks On</span>

            <strong>
              {flight.chocksOn ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Defined Push</span>

            <strong>
              {flight.std ||
                "Not specified"}
            </strong>
          </div>

          <div>
            <span>Progress</span>

            <strong>
              {completedCount}/
              {totalCount}
            </strong>
          </div>

          <div>
            <span>Signed-in Role</span>

            <strong>
              {profile?.role ||
                "No role"}
            </strong>
          </div>
        </section>

        <section className="operations-menu-next">
          <span>
            Next operational activity
          </span>

          <strong>
            {nextTaskLabel ||
              "All activities complete"}
          </strong>

          <button
            type="button"
            className="operations-menu-primary"
            onClick={() =>
              handleAction(onNextTask)
            }
          >
            <ClipboardCheck
              size={18}
              aria-hidden="true"
            />

            Open Next Task
          </button>
        </section>

        <nav className="operations-menu-section">
          <h3>Navigate</h3>

          {NAVIGATION_ITEMS.map(
            (navigationItem) => (
              <MenuButton
                key={
                  navigationItem.id
                }
                icon={
                  navigationItem.icon
                }
                label={
                  navigationItem.label
                }
                onClick={() =>
                  handleNavigation(
                    navigationItem.id
                  )
                }
              />
            )
          )}
        </nav>

        <section className="operations-menu-section">
          <h3>PTS Phases</h3>

          <div className="operations-phase-list">
            {phases.map((phase) => (
              <button
                key={phase}
                type="button"
                className={
                  activePhase === phase
                    ? "operations-phase-button active"
                    : "operations-phase-button"
                }
                onClick={() =>
                  handlePhaseChange(
                    phase
                  )
                }
              >
                <span>{phase}</span>

                <ChevronRight
                  size={17}
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </section>

        <section className="operations-menu-section">
          <h3>Actions</h3>

          {canSave ? (
            <MenuButton
              icon={Save}
              label="Save Checklist"
              onClick={() =>
                handleAction(onSave)
              }
              disabled={saveDisabled}
            />
          ) : null}

          <MenuButton
            icon={History}
            label="Checklist History"
            onClick={() =>
              handleAction(onHistory)
            }
          />

          <MenuButton
            icon={RefreshCw}
            label="Reset Checklist"
            onClick={() =>
              handleAction(onReset)
            }
            disabled={resetDisabled}
          />

          <MenuButton
            icon={Download}
            label="Print or Save PDF"
            onClick={() =>
              handleAction(onPrint)
            }
          />

          {canExport ? (
            <MenuButton
              icon={FileSpreadsheet}
              label="Excel Export"
              onClick={() =>
                handleAction(onExport)
              }
            />
          ) : null}

          <MenuButton
            icon={LogOut}
            label="Sign Out"
            onClick={() =>
              handleAction(onSignOut)
            }
            danger
          />
        </section>
      </aside>
    </div>
  );
}

export function OperationsMenuButton({
  onClick,
}) {
  return (
    <button
      type="button"
      className="ramp-button ramp-button-light operations-menu-trigger"
      onClick={onClick}
    >
      <Menu
        size={18}
        aria-hidden="true"
      />

      Menu
    </button>
  );
}