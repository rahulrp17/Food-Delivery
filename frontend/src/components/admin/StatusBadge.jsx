import Badge from '../ui/Badge';

const ORDER_STATUS_TONES = {
  pending_payment: 'warning',
  confirmed: 'info',
  preparing: 'accent',
  food_processing: 'accent',
  out_for_delivery: 'info',
  delivered: 'success',
  cancelled: 'danger',
  payment_failed: 'danger',
  refunded: 'neutral',
};

const PAYMENT_STATUS_TONES = {
  unpaid: 'warning',
  paid: 'success',
  failed: 'danger',
  refunded: 'neutral',
};

const CUSTOMER_STATUS_TONES = {
  active: 'success',
  suspended: 'danger',
};

const CUSTOMER_ROLE_TONES = {
  user: 'neutral',
  admin: 'accent',
};

const REVIEW_STATUS_TONES = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  reported: 'accent',
};

const formatLabel = (status) =>
  String(status)
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const StatusBadge = ({ status, dot = false, className = '', tones, title }) => {
  const label = formatLabel(status);
  return (
    <Badge
      tone={tones[status] || 'neutral'}
      dot={dot}
      className={className}
    >
      <span title={title || `Status: ${label}`}>{label}</span>
    </Badge>
  );
};

export function OrderStatusBadge({ status, dot = false, className = '', title }) {
  return (
    <StatusBadge
      status={status}
      dot={dot}
      className={className}
      tones={ORDER_STATUS_TONES}
      title={title}
    />
  );
}

export function PaymentStatusBadge({ status, dot = false, className = '', title }) {
  return (
    <StatusBadge
      status={status}
      dot={dot}
      className={className}
      tones={PAYMENT_STATUS_TONES}
      title={title}
    />
  );
}

export function CustomerStatusBadge({ status, dot = false, className = '', title }) {
  return (
    <StatusBadge
      status={status}
      dot={dot}
      className={className}
      tones={CUSTOMER_STATUS_TONES}
      title={title}
    />
  );
}

export function CustomerRoleBadge({ role, dot = false, className = '', title }) {
  return (
    <StatusBadge
      status={role}
      dot={dot}
      className={className}
      tones={CUSTOMER_ROLE_TONES}
      title={title}
    />
  );
}

export function ReviewStatusBadge({ status, dot = false, className = '', title }) {
  return (
    <StatusBadge
      status={status}
      dot={dot}
      className={className}
      tones={REVIEW_STATUS_TONES}
      title={title}
    />
  );
}

export default OrderStatusBadge;
