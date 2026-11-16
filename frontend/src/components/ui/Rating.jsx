import { formatRating } from "../../lib/format";
import Icon from "./Icon";
import styles from "./Rating.module.css";

const Rating = ({ value, count = 0, className = "" }) => {
  const rating = formatRating(value);

  if (!rating) return null;

  return (
    <span className={`${styles.rating} ${className}`.trim()}>
      <Icon name="star-filled" size={14} className={styles.star} />
      <span className={styles.value}>{rating}</span>
      {count > 0 ? <span className={styles.count}>({count})</span> : null}
    </span>
  );
};

export default Rating;
