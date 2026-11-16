import Button from "../components/ui/Button";
import EmptyState from "../components/ui/EmptyState";
import Icon from "../components/ui/Icon";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import styles from "./NotFoundPage.module.css";

const NotFoundPage = () => {
  useDocumentTitle("Page not found");

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.panel}>
        <EmptyState
          icon="map-pin"
          headingLevel="h1"
          title="That page is not on the menu"
          description="The link may be old or mistyped. The kitchen is still open, though."
          actions={
            <>
              <Button to="/" iconLeft={<Icon name="arrow-right" size={17} />}>
                Back home
              </Button>
              <Button to="/menu" variant="secondary">
                Browse the menu
              </Button>
            </>
          }
        />
      </div>
    </div>
  );
};

export default NotFoundPage;
