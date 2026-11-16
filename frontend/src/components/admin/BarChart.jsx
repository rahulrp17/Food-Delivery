import { memo, useId, useState, useMemo } from 'react';
import { formatINR } from '../../lib/format';
import './BarChart.css';

const BarChart = memo(function BarChart({
  data = [],
  valueKey = 'revenuePaise',
  labelKey = 'date',
  valueFormatter = formatINR,
  height = 240,
  maxBars = 30,
  ariaLabel = 'Bar chart',
  hideTitle = false,
  flush = false,
}) {
  const [showTable, setShowTable] = useState(false);
  const tableId = `barchart-table-${useId().replace(/[^a-zA-Z0-9-_]/g, '')}`;

  const maxValue = useMemo(
    () => Math.max(...data.map((d) => d[valueKey] || 0), 1),
    [data, valueKey]
  );

  const bars = useMemo(
    () => data.slice(-maxBars).map((item) => ({
      label: item[labelKey],
      value: item[valueKey] || 0,
      height: maxValue > 0 ? (item[valueKey] || 0) / maxValue : 0,
      formattedValue: valueFormatter(item[valueKey]),
    })),
    [data, valueKey, labelKey, maxBars, maxValue, valueFormatter]
  );

  const formatDateLabel = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    if (!y || !m || !d) return dateStr;
    return `${d}/${m}`;
  };

  const isDense = bars.length > 12;

  return (
    <div
      className={`barchart${hideTitle ? ' barchart-no-title' : ''}${
        flush ? ' barchart-flush' : ''
      }`}
    >
      <div className="barchart-header">
        {hideTitle ? <span /> : <h3 className="barchart-title">{ariaLabel}</h3>}
        <button
          type="button"
          className="barchart-toggle"
          onClick={() => setShowTable(!showTable)}
          aria-expanded={showTable}
          aria-controls={tableId}
        >
          {showTable ? 'Hide table' : 'View as table'}
        </button>
      </div>

      <div className="barchart-chart" aria-hidden={showTable}>
        <svg
          className={`barchart-svg${isDense ? ' is-dense' : ''}`}
          width="100%"
          height={height}
          viewBox={`0 0 ${bars.length * 36 + 40} ${height}`}
          role="img"
          aria-label={ariaLabel}
        >
          <g className="barchart-bars">
            {bars.map((bar, i) => {
              const x = 20 + i * 36;
              const barHeight = Math.max(bar.height * (height - 40), 2);
              const y = height - 20 - barHeight;
              return (
                <g key={i} className="barchart-bar-group">
                  <rect
                    x={x}
                    y={y}
                    width={24}
                    height={barHeight}
                    rx={3}
                    fill="var(--color-primary)"
                    className="barchart-bar"
                  />
                  <text
                    x={x + 12}
                    y={y - 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--color-text)"
                    className="barchart-value"
                  >
                    {bar.formattedValue}
                  </text>
                  <text
                    x={x + 12}
                    y={height - 6}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--color-text-muted)"
                    className="barchart-label"
                  >
                    {formatDateLabel(bar.label)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      <details id={tableId} open={showTable} className="barchart-table-wrapper">
        <summary className="barchart-summary">
          {showTable ? 'Hide table' : 'View data table'}
        </summary>
        <table className="barchart-table">
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col" style={{ textAlign: 'right' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {bars.map((bar, i) => (
              <tr key={i}>
                <td>{formatDateLabel(bar.label)}</td>
                <td style={{ textAlign: 'right' }}>{bar.formattedValue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
});

BarChart.displayName = 'BarChart';

export default BarChart;