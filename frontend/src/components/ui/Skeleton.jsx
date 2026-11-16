import styles from "./Skeleton.module.css";

const Skeleton = ({ width = "100%", height = "1rem", radius, className = "", style }) => (
  <span
    className={`${styles.skeleton} ${className}`.trim()}
    style={{ width, height, borderRadius: radius, ...style }}
    aria-hidden="true"
  />
);

export default Skeleton;
