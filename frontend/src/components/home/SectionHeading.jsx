import styles from "./SectionHeading.module.css";

/**
 * The shared heading block for every home section.
 *
 * `id` is optional but recommended: it lets the section element point at its
 * own heading with `aria-labelledby`.
 */
const SectionHeading = ({
  eyebrow,
  title,
  description,
  action,
  id,
  className = "",
}) => (
  <div className={`${styles.heading} ${className}`.trim()}>
    <div className={styles.copy}>
      {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
      <h2 id={id} className={styles.title}>
        {title}
      </h2>
      {description ? <p className={styles.description}>{description}</p> : null}
    </div>
    {action ? <div className={styles.action}>{action}</div> : null}
  </div>
);

export default SectionHeading;
