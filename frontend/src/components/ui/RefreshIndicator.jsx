import styles from "./RefreshIndicator.module.css";

/**
 * A quiet indicator that shows while a query refreshes in the background.
 *
 * Data stays on screen — this only signals that newer values are arriving,
 * so the user is never shown a full-page skeleton for a background refetch.
 */
export function RefreshIndicator({ isFetching, label = "Refreshing" }) {
  if (!isFetching) return null;

  return (
    <span className={styles.indicator} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </span>
  );
}

export default RefreshIndicator;
