import Icon from "../ui/Icon";
import "./DeliveryStrip.css";

const PROMISES = [
  {
    icon: "truck",
    label: "Delivery in",
    value: "25–30 min",
    tone: "speed",
  },
  {
    icon: "tag",
    label: "Free delivery over",
    value: "₹499",
    tone: "offer",
  },
  {
    icon: "shield-check",
    label: "Hygiene rated",
    value: "Kitchen",
    tone: "trust",
  },
  {
    icon: "leaf",
    label: "Every dish",
    value: "Cooked to order",
    tone: "fresh",
  },
];

/**
 * Delivery promise strip.
 *
 * Food-ordering platforms always answer the three questions a customer has
 * before they browse: how long, how much for delivery, and can I trust it.
 * This puts those answers above the fold, on one line.
 */
export default function DeliveryStrip({ className = "" }) {
  return (
    <ul className={`delivery-strip ${className}`.trim()}>
      {PROMISES.map((promise) => (
        <li key={promise.label} className={`delivery-promise tone-${promise.tone}`}>
          <span className="delivery-promise-icon">
            <Icon name={promise.icon} size={16} />
          </span>
          <span className="delivery-promise-copy">
            <span className="delivery-promise-label">{promise.label}</span>
            <span className="delivery-promise-value">{promise.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
