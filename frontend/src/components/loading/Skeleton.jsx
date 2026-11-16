import "./loading.css";

/**
 * Base skeleton primitive.
 *
 * Renders the global `.skeleton` class (defined in styles/globals.css) so
 * that any page can also use `className="skeleton"` directly and get an
 * identical, warm, shimmering placeholder.
 */
export function Skeleton({
  width = "100%",
  height = "1rem",
  radius,
  className = "",
  style,
}) {
  return (
    <span
      aria-hidden="true"
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius: radius, ...style }}
    />
  );
}

/** A stack of text lines with the last one optionally shorter. */
export function TextSkeleton({ lines = 3, className = "", lastLineWidth = "60%" }) {
  return (
    <div className={`ld-text ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <span
          key={index}
          className={`skeleton ld-line${index === lines - 1 ? " ld-line-sm" : ""}`}
          style={index === lines - 1 ? { width: lastLineWidth } : undefined}
        />
      ))}
    </div>
  );
}

export default Skeleton;
