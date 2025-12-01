/**
 * @file BarChart.tsx
 * @description A simple, reusable bar chart component using SVG.
 */
import React from 'react';
import DOMPurify from 'dompurify';

interface BarChartProps {
  data: {
    label: string;
    value: number;
    color: string;
  }[];
}

const BarChart: React.FC<BarChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return null;
  }
  
  // Helper function to sanitize text content for safe rendering inside SVG elements
  const sanitizeText = (text: string | number): string => {
    // Convert to string first
    const str = String(text);
    // Use DOMPurify to strip any potentially malicious HTML/SVG markup.
    // We use {ALLOWED_TAGS: []} to ensure only plain text remains.
    return DOMPurify.sanitize(str, {ALLOWED_TAGS: []});
  };
  
  const topPadding = 20; // Add space at the top for labels on the highest bars
  const maxValue = Math.max(...data.map(d => d.value), 0);
  const chartHeight = 200;
  const barWidth = 40;
  const barMargin = 20;
  const chartWidth = data.length * (barWidth + barMargin);
  // Adjust scale to leave room at the top
  const scale = maxValue > 0 ? (chartHeight - topPadding) / maxValue : 0;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
        width="100%"
        height={chartHeight + 40}
        aria-label="Bar chart"
        role="img"
      >
        <title>Squad Performance by Total Marks</title>
        {data.map((d, i) => {
          const barHeight = d.value * scale;
          const x = i * (barWidth + barMargin) + barMargin / 2;
          const y = chartHeight - barHeight;

          const sanitizedLabel = sanitizeText(d.label);
          const sanitizedValue = sanitizeText(d.value);

          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={d.color}
                rx="4"
                ry="4"
              >
                {/* Sanitize content rendered inside <title> for tooltip safety */}
                <title>{`${sanitizedLabel}: ${sanitizedValue} marks`}</title>
              </rect>
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                fontSize="14"
                fontWeight="bold"
                fill="#334155"
              >
                {/* Sanitize content rendered inside <text> */}
                {sanitizedValue}
              </text>
              <text
                x={x + barWidth / 2}
                y={chartHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#64748b"
              >
                {/* Sanitize content rendered inside <text> */}
                {sanitizedLabel}
              </text>
            </g>
          );
        })}
        <line
            x1="0"
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="#cbd5e1"
            strokeWidth="2"
        />
      </svg>
    </div>
  );
};

export default BarChart;