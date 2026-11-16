import Button from "./Button";
import Icon from "./Icon";
import styles from "./StatePanel.module.css";

const ErrorState = ({
  title = "Something went wrong",
  description = "We could not load this right now. Please try again.",
  onRetry,
  headingLevel = "h3",
}) => {
  const Heading = headingLevel;

  return (
    <div className={styles.panel} role="alert">
      <span className={styles.icon}>
        <Icon name="alert-circle" size={26} />
      </span>
      <Heading className={styles.title}>{title}</Heading>
      <p className={styles.description}>{description}</p>
      {onRetry ? (
        <div className={styles.actions}>
          <Button variant="secondary" onClick={onRetry} iconLeft={<Icon name="refresh" />}>
            Try again
          </Button>
        </div>
      ) : null}
    </div>
  );
};

export { ErrorState };
export default ErrorState;
