function calculatePercentage(value, total) {
  if (!total) {
    return 0;
  }

  return Math.round((value / total) * 100);
}

export default function ChecklistMetrics({ metrics, totalItems }) {
  const total = Number.isFinite(totalItems) ? totalItems : metrics.total || 0;

  const completed = metrics.done || 0;

  const completedPercentage = calculatePercentage(completed, total);

  return (
    <section
      className="metrics-grid"
      aria-label="Turnaround operational performance metrics"
    >
      <article className="metric-card metric-green">
        <span>On Time</span>

        <strong>{metrics.ontime}</strong>

        <small>Completed operational tasks</small>
      </article>

      <article className="metric-card metric-amber">
        <span>Slightly Delayed</span>

        <strong>{metrics.light}</strong>

        <small>Completed operational tasks</small>
      </article>

      <article className="metric-card metric-red">
        <span>Delayed</span>

        <strong>{metrics.delay}</strong>

        <small>Completed operational tasks</small>
      </article>

      <article className="metric-card metric-blue">
        <span>Completed / Total</span>

        <strong>
          {completed}/{total}
        </strong>

        <small>{completedPercentage}% complete</small>
      </article>
    </section>
  );
}
