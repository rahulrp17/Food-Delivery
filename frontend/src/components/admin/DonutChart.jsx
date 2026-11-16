import { useMemo } from 'react';
import './DonutChart.css';

export default function DonutChart({
  data = [],
  centerLabel = 'orders',
  valueFormatter = (value) => value,
  ariaLabel = 'Distribution chart',
}) {
  const segments = useMemo(() => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0);
    let offset = 0;

    return {
      total,
      items: data
        .filter((item) => item.value > 0)
        .map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          const segment = {
            ...item,
            percent,
            offset,
          };
          offset += percent;
          return segment;
        }),
    };
  }, [data]);

  if (!segments.total) {
    return (
      <p className="donut-empty">
        There is no data to chart for this period yet.
      </p>
    );
  }

  return (
    <div className="donut-chart">
      <div className="donut-visual">
        <svg viewBox="0 0 120 120" role="img" aria-label={ariaLabel}>
          <circle className="donut-track" cx="60" cy="60" r="46" />
          {segments.items.map((segment) => (
            <circle
              key={segment.label}
              className="donut-segment"
              cx="60"
              cy="60"
              r="46"
              pathLength="100"
              stroke={segment.color}
              strokeDasharray={`${segment.percent} ${100 - segment.percent}`}
              strokeDashoffset={-segment.offset}
            >
              <title>
                {segment.label}: {segment.value} ({Math.round(segment.percent)}%)
              </title>
            </circle>
          ))}
          <text className="donut-total" x="60" y="58" textAnchor="middle">
            {valueFormatter(segments.total)}
          </text>
          <text className="donut-caption" x="60" y="74" textAnchor="middle">
            {centerLabel}
          </text>
        </svg>
      </div>

      <ul className="donut-legend">
        {segments.items.map((segment) => (
          <li key={segment.label}>
            <span className="donut-legend-dot" style={{ background: segment.color }} />
            <span className="donut-legend-label">{segment.label}</span>
            <span className="donut-legend-value">
              {segment.value}
              <span>{Math.round(segment.percent)}%</span>
            </span>
          </li>
        ))}
      </ul>

      <table className="visually-hidden">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Category</th>
            <th scope="col">Value</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {segments.items.map((segment) => (
            <tr key={segment.label}>
              <th scope="row">{segment.label}</th>
              <td>{segment.value}</td>
              <td>{Math.round(segment.percent)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
