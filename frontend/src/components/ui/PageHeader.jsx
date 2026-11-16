import styles from "./PageHeader.module.css";

/**
 * Consistent page header used across admin and customer surfaces.
 *
 * Renders an optional eyebrow, a title, an optional description and a
 * right-aligned action slot. On narrow viewports the actions drop below
 * the title and become full-width.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  children,
  className = "",
}) {
  return (
    <header className={`${styles.pageHeader} ${className}`.trim()}>
      <div className={styles.heading}>
        {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? <p className={styles.description}>{description}</p> : null}
        {children}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

/**
 * Section heading used inside panels. Deliberately lighter than PageHeader
 * so a page can nest sections without every level shouting.
 */
export function SectionHeader({ title, description, actions, className = "" }) {
  return (
    <div className={`${styles.sectionHeader} ${className}`.trim()}>
      <div className={styles.heading}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description ? <p className={styles.sectionDescription}>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

export default PageHeader;
