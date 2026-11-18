import { useEffect, useState } from "react";
import Icon from "./Icon";

/**
 * An <img> that swaps to an icon placeholder when the source is missing or
 * fails to load. Order snapshots can point at images that no longer exist,
 * so a broken-image icon must never reach the customer.
 */
const SafeImage = ({
  src,
  alt = "",
  className = "",
  fallbackClassName = "",
  fallbackIcon = "chef-hat",
  fallbackSize = 18,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <span
        className={`${className} ${fallbackClassName}`.trim()}
        role="img"
        aria-label={alt || "Image unavailable"}
      >
        <Icon name={fallbackIcon} size={fallbackSize} />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

export default SafeImage;
