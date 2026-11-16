import { Link } from "react-router-dom";
import { getCategories, getProducts } from "../api/catalog";
import CategoryRail from "../components/home/CategoryRail";
import Hero from "../components/home/Hero";
import HowItWorks from "../components/home/HowItWorks";
import OfferBand from "../components/home/OfferBand";
import ProductRail from "../components/home/ProductRail";
import StoryBand from "../components/home/StoryBand";
import Button from "../components/ui/Button";
import ErrorState from "../components/ui/ErrorState";
import Icon from "../components/ui/Icon";
import { useApiQuery } from "../hooks/useApiQuery";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import styles from "./HomePage.module.css";

const HomePage = () => {
  useDocumentTitle("Fresh food, delivered");

  const categories = useApiQuery(
    (signal) => getCategories({ signal }),
    "home-categories"
  );

  const picks = useApiQuery(
    (signal) => getProducts({ limit: 8, sort: "popular" }, { signal }),
    "home-picks"
  );

  const value = useApiQuery(
    (signal) => getProducts({ limit: 8, sort: "price_asc", inStock: true }, { signal }),
    "home-value"
  );

  const pickItems = picks.data?.items || [];
  const valueItems = value.data?.items || [];

  return (
    <div>
      <Hero featured={pickItems} loading={picks.loading} />

      {categories.error ? (
        <div className={`container ${styles.errorWrap}`}>
          <ErrorState
            title="We could not load the menu categories"
            description={categories.error.message}
            onRetry={categories.reload}
          />
        </div>
      ) : (
        <CategoryRail categories={categories.data || []} loading={categories.loading} />
      )}

      {picks.error ? (
        <div className={`container ${styles.errorWrap}`}>
          <ErrorState
            title="Tonight's picks are taking a moment"
            description={picks.error.message}
            onRetry={picks.reload}
          />
        </div>
      ) : (
        <ProductRail
          eyebrow="Tonight's picks"
          title="Start with something good."
          description="The dishes we would order ourselves. Cooked to order and ready in around half an hour."
          products={pickItems}
          loading={picks.loading}
        />
      )}

      <OfferBand />

      <HowItWorks />

      <StoryBand
        image={pickItems[2]?.image?.url || pickItems[0]?.image?.url}
        imageAlt={pickItems[2]?.name || pickItems[0]?.name}
        loading={picks.loading}
      />

      {value.error ? (
        <div className={`container ${styles.errorWrap}`}>
          <ErrorState
            title="Everyday value could not load"
            description={value.error.message}
            onRetry={value.reload}
          />
        </div>
      ) : (
        <ProductRail
          variant="list"
          eyebrow="Everyday value"
          title="Great food, sensible prices."
          description="Full-flavoured plates that do not ask you to spend a fortune on a Tuesday."
          products={valueItems}
          loading={value.loading}
          action={
            <Link to="/menu?maxPricePaise=15000" className="eyebrow">
              Shop under ₹150
              <Icon name="arrow-right" size={16} />
            </Link>
          }
        />
      )}

      <section className={`container ${styles.ctaSection}`}>
        <div className={styles.ctaPanel}>
          <div className={styles.ctaCopy}>
            <span className={styles.ctaEyebrow}>One tap away</span>
            <h2 className={styles.ctaTitle}>Hungry now?</h2>
            <p className={styles.ctaText}>
              The full menu is waiting. Pick a dish and we will handle the rest.
            </p>
          </div>
          <Button to="/menu" iconRight={<Icon name="arrow-right" size={18} />}>
            Browse the menu
          </Button>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
