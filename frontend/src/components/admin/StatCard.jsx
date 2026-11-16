import { memo } from 'react';
import Icon from '../ui/Icon';
import { useCountUp } from '../../hooks/useCountUp';
import './StatCard.css';

const StatCard = memo(function StatCard({
  label,
  value,
  delta = null,
  deltaLabel = 'vs prev period',
  formatter = (v) => v,
  icon = 'bar-chart',
  tone = 'primary',
  hint = null,
  className = '',
}) {
  const isNumber = typeof value === 'number';
  const animated = useCountUp(isNumber ? value : 0);
  const displayValue = formatter(isNumber ? animated : value);
  const isPositive = delta !== null && delta > 0;
  const isNegative = delta !== null && delta < 0;

  return (
    <article className={`statcard is-${tone} ${className}`.trim()}>
      <div className="statcard-header">
        <div className="statcard-icon">
          <Icon name={icon} size={22} label="" aria-hidden="true" />
        </div>
        <span className="statcard-label">{label}</span>
      </div>
      <div className="statcard-value">{displayValue}</div>
      {hint ? <p className="statcard-hint">{hint}</p> : null}
      {delta !== null && (
        <div className={`statcard-delta ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}>
          <Icon name={isPositive ? 'chevron-up' : isNegative ? 'chevron-down' : 'minus'} size={12} label="" />
          <span>{Math.abs(delta)}%</span>
          <span className="statcard-delta-label">{deltaLabel}</span>
        </div>
      )}
    </article>
  );
});

StatCard.displayName = 'StatCard';

export default StatCard;
