import { useEffect, useState } from "react";
import Icon from "./Icon";
import styles from "./SmartImage.module.css";

const SmartImage = ({
  src,
  alt,
  ratio = "4 / 3",
  className = "",
  imageClassName = "",
  loading = "lazy",
  fetchPriority,
  children,
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !failed;

  return (
    <span
      className={`${styles.frame} ${className}`.trim()}
      style={{ aspectRatio: ratio }}
    >
      {showImage ? (
        <img
          className={`${styles.image} ${imageClassName}`.trim()}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          fetchPriority={fetchPriority}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.placeholder} role="img" aria-label={alt || "Image unavailable"}>
          <Icon name="chef-hat" size={40} />
        </span>
      )}
      {children}
    </span>
  );
};

export default SmartImage;
