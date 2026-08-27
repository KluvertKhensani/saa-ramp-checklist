export default function ChecklistMetrics({
  metrics,
  totalItems,
}) {
  return (
    <section className="metrics-grid">
      <article className="metric-card metric-green">
        <span>On Time</span>
        <strong>{metrics.ontime}</strong>
      </article>

      <article className="metric-card metric-amber">
        <span>Light Delay</span>
        <strong>{metrics.light}</strong>
      </article>

      <article className="metric-card metric-red">
        <span>Delay</span>
        <strong>{metrics.delay}</strong>
      </article>

      <article className="metric-card metric-blue">
        <span>Done / Total</span>
        <strong>
          {metrics.done}/{totalItems}
        </strong>
      </article>
    </section>
  );
}