import { Link } from "react-router-dom";
import styles from "./Button.module.css";

const Button = ({
  children,
  variant = "primary",
  size = "md",
  to,
  href,
  type = "button",
  loading = false,
  fullWidth = false,
  iconOnly = false,
  iconLeft,
  iconRight,
  className = "",
  disabled = false,
  ...rest
}) => {
  const classes = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth ? styles.fullWidth : "",
    iconOnly ? styles.iconOnly : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : iconLeft}
      {children}
      {!loading && iconRight}
    </>
  );

  const shared = {
    className: classes,
    "aria-busy": loading || undefined,
    ...rest,
  };

  if (to && !disabled) {
    return (
      <Link to={to} {...shared}>
        {content}
      </Link>
    );
  }

  if (href && !disabled) {
    return (
      <a href={href} {...shared}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} disabled={disabled || loading} {...shared}>
      {content}
    </button>
  );
};

export default Button;
