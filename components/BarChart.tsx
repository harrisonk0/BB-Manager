import React from "react";
import "./reporting/reporting.css";
interface BarChartProps {
  data: { label: string; value: number; color: string }[];
}
/** Text equivalents remain available without colour, SVG scaling or hover. */
const BarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data?.length) return null;
  const max = Math.max(...data.map((row) => row.value), 0);
  return (
    <ul
      className="bb-report-chart"
      aria-label="Squad performance by total marks"
    >
      {data.map((row) => (
        <li key={row.label}>
          <div className="bb-report-chart-label">
            <span>{row.label}</span>
            <strong className="bb-report-value">{row.value} marks</strong>
          </div>
          <div className="bb-report-chart-track" aria-hidden="true">
            <div
              className="bb-report-chart-fill"
              style={{
                width: `${max ? (row.value / max) * 100 : 0}%`,
                backgroundColor: row.color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};
export default BarChart;
