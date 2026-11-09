import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Plane,
} from "lucide-react";

function formatPercentage(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0%";
  }

  return `${number.toFixed(1)}%`;
}

export default function ReportingKpis({ kpis }) {
  const cards = [
    {
      key: "flights",
      label: "Flights",
      value: kpis.totalFlights,
      note: `${kpis.completedFlights} completed`,
      icon: Plane,
      className: "",
    },
    {
      key: "completion",
      label: "Checklist Completion",
      value: formatPercentage(
        kpis.checklistCompletionPercentage,
      ),
      note: `${kpis.completedActivities}/${kpis.totalActivities} activities`,
      icon: ClipboardCheck,
      className: "reporting-kpi-blue",
    },
    {
      key: "on-time",
      label: "Operational On Time",
      value: formatPercentage(
        kpis.operationalOnTimePercentage,
      ),
      note: `${kpis.onTimeActivities} activities`,
      icon: CheckCircle2,
      className: "reporting-kpi-green",
    },
    {
      key: "light-delay",
      label: "Slight Delays",
      value: kpis.lightDelayActivities,
      note: "Completed operational activities",
      icon: Clock3,
      className: "reporting-kpi-gold",
    },
    {
      key: "delays",
      label: "Material Delays",
      value: kpis.delayedActivities,
      note: "Completed operational activities",
      icon: BarChart3,
      className: "reporting-kpi-red",
    },
    {
      key: "exceptions",
      label: "High-Impact Exceptions",
      value: kpis.highImpactExceptions,
      note: "Operational exceptions requiring review",
      icon: AlertTriangle,
      className: "reporting-kpi-red",
    },
  ];

  return (
    <section
      className="reporting-kpi-grid"
      aria-label="Management reporting indicators"
    >
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <article
            key={card.key}
            className={`reporting-kpi-card ${card.className}`}
          >
            <div className="reporting-kpi-icon">
              <Icon size={20} aria-hidden="true" />
            </div>

            <span>{card.label}</span>

            <strong>{card.value}</strong>

            <small>{card.note}</small>
          </article>
        );
      })}
    </section>
  );
}