import { useId } from "react";
import styles from "./Input.module.css";

const Input = ({
  label,
  hint,
  error,
  id,
  name,
  leadingIcon,
  trailing,
  trailingButton = false,
  trailingAriaLabel = "Toggle trailing",
  onTrailingClick,
  className = "",
  containerClassName = "",
  disabled = false,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`${styles.field} ${containerClassName}`.trim()}>
      {label ? (
        <label className={styles.label} htmlFor={inputId}>
          {label}
        </label>
      ) : null}

      <div className={styles.control}>
        {leadingIcon ? <span className={styles.leading}>{leadingIcon}</span> : null}
        <input
          id={inputId}
          style={{
            paddingLeft: leadingIcon ? "2.5rem" : undefined,
            paddingRight: trailing ? "2.5rem" : undefined,
          }}
          className={
            [
              styles.input,
              leadingIcon ? styles.withLeading : "",
              trailing ? styles.withTrailing : "",
              className,
            ]
              .filter(Boolean)
              .join(" ")
          }
          name={name}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          {...rest}
        />
        {trailing ? (
          trailingButton ? (
            <button
              type="button"
              className={styles.trailingButton}
              disabled={disabled}
              onClick={onTrailingClick}
              aria-label={trailingAriaLabel}
            >
              {trailing}
            </button>
          ) : (
            <span className={styles.trailing}>{trailing}</span>
          )
        ) : null}
      </div>

      {hint && !error ? (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
};

export default Input;
