import Icon from "./Icon";
import styles from "./FilterToolbar.module.css";

/**
 * A search field with a leading icon and a clear affordance.
 * Used by the admin filter toolbars and the customer search page.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  label = "Search",
  className = "",
  id,
}) {
  return (
    <div className={`${styles.search} ${className}`.trim()}>
      <Icon name="search" size={16} className={styles.searchIcon} />
      <input
        id={id}
        type="search"
        className={styles.searchInput}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          className={styles.searchClear}
          onClick={() => onChange("")}
          aria-label="Clear search"
        >
          <Icon name="x" size={14} />
        </button>
      ) : null}
    </div>
  );
}

/**
 * The filter toolbar that sits above admin data tables: a search field, a
 * row of filter controls and a right-aligned action slot.
 *
 * On narrow viewports the controls stack to full width rather than
 * shrinking below a usable touch target.
 */
export function FilterToolbar({ children, actions, className = "" }) {
  return (
    <div className={`${styles.toolbar} ${className}`.trim()} role="search">
      <div className={styles.controls}>{children}</div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

/** A labelled select control for the filter toolbar. */
export function FilterSelect({ label, value, onChange, options, className = "", id }) {
  return (
    <label className={`${styles.select} ${className}`.trim()} htmlFor={id}>
      <span className={styles.selectLabel}>{label}</span>
      <select
        id={id}
        className={styles.selectControl}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** A labelled text input for the filter toolbar. */
export function FilterInput({ label, value, onChange, placeholder, type = "text", className = "", id }) {
  return (
    <label className={`${styles.select} ${className}`.trim()} htmlFor={id}>
      <span className={styles.selectLabel}>{label}</span>
      <input
        id={id}
        type={type}
        className={styles.inputControl}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}

export default FilterToolbar;
