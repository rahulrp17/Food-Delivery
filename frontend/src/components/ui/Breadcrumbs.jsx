import { Link } from "react-router-dom";
import Icon from "./Icon";
import styles from "./Breadcrumbs.module.css";

/**
 * Breadcrumb trail for the admin topbar.
 *
 * `items` is an ordered array of `{ label, to }`. The final item is the
 * current page and is rendered as plain text (not a link) for correct
 * screen-reader semantics.
 */
export function Breadcrumbs({ items = [], className = "" }) {
  if (!items.length) return null;

  return (
    <nav className={`${styles.breadcrumbs} ${className}`.trim()} aria-label="Breadcrumb">
      <ol className={styles.list}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className={styles.item}>
              {item.to && !isLast ? (
                <Link to={item.to} className={styles.link}>
                  {item.label}
                </Link>
              ) : (
                <span className={styles.current} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast ? <Icon name="chevron-right" size={13} className={styles.separator} /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default Breadcrumbs;
