import Icon from "./Icon";
import styles from "./StatePanel.module.css";

/**
 * `headingLevel` lets a page promote the panel title to an `h1` when the
 * panel is the entire page body (for example the 404 page). It defaults to
 * `h3` because the panel is usually nested inside a section that already
 * owns the `h2`.
 */
const EmptyState = ({ icon = "search", title, description, actions, headingLevel = "h3" }) => {
  const Heading = headingLevel;

  return (
    <div className={styles.panel}>
      <span className={styles.icon}>
        <Icon name={icon} size={26} />
      </span>
      <Heading className={styles.title}>{title}</Heading>
      {description ? <p className={styles.description}>{description}</p> : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
};

export { EmptyState };
export default EmptyState;
