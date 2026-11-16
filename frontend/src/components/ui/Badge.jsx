import styles from "./Badge.module.css";

const Badge = ({ tone = "neutral", dot = false, className = "", children, ...rest }) => (
  <span
    className={`${styles.badge} ${styles[tone] || ""} ${className}`.trim()}
    {...rest}
  >
    {dot ? <span className={styles.dot} aria-hidden="true" /> : null}
    {children}
  </span>
);

export default Badge;
