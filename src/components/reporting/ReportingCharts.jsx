import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const STATUS_COLOURS = [
  "#14804a",
  "#d49a00",
  "#c7353f",
  "#718096",
];

function EmptyChart({ message }) {
  return (
    <div className="reporting-chart-empty">
      {message}
    </div>
  );
}

export default function ReportingCharts({
  statusData,
  dailyData,
  phaseData,
  delayedActivities,
}) {
  return (
    <section className="reporting-chart-grid">
      <article className="reporting-chart-card">
        <div className="reporting-section-heading">
          <div>
            <span>Operational status</span>
            <h3>Activity Distribution</h3>
          </div>
        </div>

        {statusData.some((item) => item.value > 0) ? (
          <div className="reporting-chart">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={2}
                >
                  {statusData.map((item, index) => (
                    <Cell
                      key={item.name}
                      fill={
                        STATUS_COLOURS[
                          index % STATUS_COLOURS.length
                        ]
                      }
                    />
                  ))}
                </Pie>

                <Tooltip />

                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No operational activity data is available." />
        )}
      </article>

      <article className="reporting-chart-card">
        <div className="reporting-section-heading">
          <div>
            <span>Daily trend</span>
            <h3>On-Time Performance</h3>
          </div>
        </div>

        {dailyData.length > 0 ? (
          <div className="reporting-chart">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="date" />

                <YAxis domain={[0, 100]} />

                <Tooltip />

                <Legend />

                <Line
                  type="monotone"
                  dataKey="onTimePercentage"
                  name="On-Time %"
                  stroke="#14804a"
                  strokeWidth={3}
                  activeDot={{ r: 6 }}
                />

                <Line
                  type="monotone"
                  dataKey="completionPercentage"
                  name="Completion %"
                  stroke="#174f8f"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No daily performance data is available." />
        )}
      </article>

      <article className="reporting-chart-card">
        <div className="reporting-section-heading">
          <div>
            <span>Operational phases</span>
            <h3>Delay Distribution</h3>
          </div>
        </div>

        {phaseData.length > 0 ? (
          <div className="reporting-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={phaseData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis dataKey="phase" />

                <YAxis allowDecimals={false} />

                <Tooltip />

                <Legend />

                <Bar
                  dataKey="slightDelay"
                  name="Slight Delay"
                  stackId="delay"
                  fill="#d49a00"
                />

                <Bar
                  dataKey="delay"
                  name="Delay"
                  stackId="delay"
                  fill="#c7353f"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No phase performance data is available." />
        )}
      </article>

      <article className="reporting-chart-card">
        <div className="reporting-section-heading">
          <div>
            <span>Operational exceptions</span>
            <h3>Top Delayed Activities</h3>
          </div>
        </div>

        {delayedActivities.length > 0 ? (
          <div className="reporting-chart">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={delayedActivities}
                layout="vertical"
                margin={{
                  left: 20,
                  right: 20,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis type="number" allowDecimals={false} />

                <YAxis
                  type="category"
                  dataKey="shortActivity"
                  width={115}
                />

                <Tooltip />

                <Bar
                  dataKey="delayCount"
                  name="Delay Occurrences"
                  fill="#c7353f"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChart message="No delayed activities were found." />
        )}
      </article>
    </section>
  );
}