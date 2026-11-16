import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Link, useParams } from "react-router-dom";
import { getProduct } from "../api/catalog";
import ProductRail from "../components/home/ProductRail";
import DeliveryStrip from "../components/product/DeliveryStrip";
import ProductReviews from "../components/product/ProductReviews";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import ErrorState from "../components/ui/ErrorState";
import Icon from "../components/ui/Icon";
import Rating from "../components/ui/Rating";
import Skeleton from "../components/ui/Skeleton";
import SmartImage from "../components/ui/SmartImage";
import { useApiQuery } from "../hooks/useApiQuery";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useCart } from "../hooks/useCart";
import { deliveryWindow, formatINR } from "../lib/format";
import styles from "./ProductPage.module.css";

const ProductSkeleton = () => (
  <div className={styles.skeletonLayout}>
    <div className={styles.skeletonGallery}>
      <Skeleton height="auto" radius="24px" style={{ aspectRatio: "4 / 3" }} />
      <div className={styles.skeletonThumbs}>
        {[...Array(3)].map((_, index) => (
          <Skeleton key={index} width="76px" height="76px" radius="12px" />
        ))}
      </div>
    </div>
    <div className={styles.skeletonCopy}>
      <Skeleton width="30%" height="1.5rem" radius="999px" />
      <Skeleton width="80%" height="3rem" />
      <Skeleton width="60%" height="1rem" />
      <Skeleton width="100%" height="1rem" />
      <Skeleton width="90%" height="1rem" />
      <Skeleton width="34%" height="2.5rem" />
      <Skeleton width="100%" height="3rem" radius="8px" />
    </div>
  </div>
);

const ProductPage = () => {
  const { slug } = useParams();
  const [activeImage, setActiveImage] = useState(0);
  const { addItem, isAdding } = useCart();
  const reduceMotion = useReducedMotion();

  const query = useApiQuery(
    (signal) => getProduct(slug, { signal }),
    `product-${slug}`
  );

  const product = query.data?.product;
  const related = query.data?.related || [];

  useDocumentTitle(product?.name || "Dish");

  useEffect(() => {
    setActiveImage(0);
  }, [slug]);

  if (query.loading) {
    return (
      <div className={`container ${styles.page}`}>
        <ProductSkeleton />
      </div>
    );
  }

  if (query.error || !product) {
    return (
      <div className={`container ${styles.page}`}>
        <ErrorState
          headingLevel="h1"
          title="We could not find that dish"
          description={
            query.error?.message ||
            "It may have left the menu. Browse the full menu to see what is cooking."
          }
          onRetry={query.reload}
        />
        <div className={styles.errorAction}>
          <Button to="/menu" variant="secondary" iconLeft={<Icon name="chevron-left" />}>
            Back to the menu
          </Button>
        </div>
      </div>
    );
  }

  const images = [
    product.image?.url,
    ...(product.gallery || []).map((image) => image.url),
  ].filter((url, index, list) => url && list.indexOf(url) === index);

  const active = images[activeImage] || images[0];
  const soldOut = !product.isAvailable || product.stock <= 0;
  const savings = product.compareAtPricePaise
    ? product.compareAtPricePaise - product.pricePaise
    : 0;

  const nutrition = [
    ["Calories", product.nutrition?.calories, "kcal"],
    ["Protein", product.nutrition?.proteinG, "g"],
    ["Carbs", product.nutrition?.carbsG, "g"],
    ["Fat", product.nutrition?.fatG, "g"],
  ].filter(([, value]) => value !== undefined && value !== null);

  return (
    <div>
      <div className={`container ${styles.page}`}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link to="/">Home</Link>
          <Icon name="chevron-right" size={14} />
          <Link to="/menu">Menu</Link>
          {product.category ? (
            <>
              <Icon name="chevron-right" size={14} />
              <Link to={`/menu?category=${encodeURIComponent(product.category.slug)}`}>
                {product.category.name}
              </Link>
            </>
          ) : null}
          <Icon name="chevron-right" size={14} />
          <span className={styles.current} aria-current="page">
            {product.name}
          </span>
        </nav>

        <div className={styles.layout}>
          <div className={styles.gallery}>
            <div className={styles.stage}>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  className={styles.stageFrame}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                >
                  <SmartImage
                    src={active}
                    alt={product.name}
                    ratio="4 / 3"
                    className={styles.mainFrame}
                    loading="eager"
                  />
                </motion.div>
              </AnimatePresence>

              {images.length > 1 ? (
                <span className={styles.counter} aria-hidden="true">
                  {activeImage + 1} / {images.length}
                </span>
              ) : null}
            </div>

            {images.length > 1 ? (
              <div className={styles.thumbs} role="group" aria-label={`${product.name} images`}>
                {images.map((image, index) => (
                  <button
                    key={image}
                    type="button"
                    className={`${styles.thumb} ${index === activeImage ? styles.thumbActive : ""}`.trim()}
                    onClick={() => setActiveImage(index)}
                    aria-label={`Show image ${index + 1} of ${product.name}`}
                    aria-pressed={index === activeImage}
                  >
                    <SmartImage
                      src={image}
                      alt=""
                      ratio="1 / 1"
                      className={styles.thumbImage}
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.panel}>
            <div className={styles.panelInner}>
              <div className={styles.badges}>
                {product.isVeg ? (
                  <Badge tone="veg" dot>
                    Vegetarian
                  </Badge>
                ) : (
                  <Badge tone="nonVeg" dot>
                    Non-vegetarian
                  </Badge>
                )}
                {product.isBestseller ? <Badge tone="bestseller">Bestseller</Badge> : null}
                {product.isNew ? <Badge tone="new">New</Badge> : null}
                {soldOut ? <Badge tone="soldOut">Sold out</Badge> : null}
              </div>

              <h1 className={styles.title}>{product.name}</h1>

              <DeliveryStrip className={styles.promiseStrip} />

              <div className={styles.meta}>
                {product.category ? (
                  <Link
                    to={`/menu?category=${encodeURIComponent(product.category.slug)}`}
                    className={styles.metaCategory}
                  >
                    {product.category.name}
                  </Link>
                ) : null}
                {product.category ? (
                  <span className={styles.divider} aria-hidden="true" />
                ) : null}
                <span className={styles.metaItem}>
                  <Icon name="clock" size={16} />
                  {deliveryWindow(product.prepTimeMinutes)}
                </span>
                {product.ratingCount > 0 ? (
                  <>
                    <span className={styles.divider} aria-hidden="true" />
                    <Rating value={product.ratingAvg} count={product.ratingCount} />
                  </>
                ) : null}
              </div>

              <p className={styles.description}>
                {product.shortDescription || product.description}
              </p>

              <div className={styles.priceRow}>
                <span className={styles.price}>{formatINR(product.pricePaise)}</span>
                {savings > 0 ? (
                  <>
                    <span className={styles.compare}>
                      {formatINR(product.compareAtPricePaise)}
                    </span>
                    <span className={styles.save}>Save {formatINR(savings)}</span>
                  </>
                ) : null}
              </div>
              <p className={styles.taxNote}>Inclusive of applicable taxes.</p>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={`${styles.addToCart} ${soldOut ? styles.disabled : ""}`}
                  onClick={() => !soldOut && addItem(product.id, 1)}
                  disabled={soldOut || isAdding}
                  aria-label={soldOut ? "Sold out" : `Add ${product.name} to cart`}
                  aria-busy={isAdding || undefined}
                >
                  {isAdding ? (
                    <Icon name="spinner" size={18} className="spinner-animate" />
                  ) : (
                    <Icon name="plus" size={18} />
                  )}
                  <span>{isAdding ? "Adding..." : "Add to Cart"}</span>
                </button>

                <Button
                  to={`/menu?category=${encodeURIComponent(product.category?.slug || "")}`}
                  variant="secondary"
                  iconLeft={<Icon name="chevron-left" size={17} />}
                >
                  More {product.category?.name || "dishes"}
                </Button>
              </div>

              <p
                className={`${styles.availability} ${soldOut ? styles.unavailable : ""}`.trim()}
              >
                <Icon name={soldOut ? "alert-circle" : "check"} size={17} strokeWidth={2} />
                {soldOut
                  ? "This dish is off the menu for now. Please check back soon."
                  : "Available now, made to order"}
              </p>

              <div className={styles.facts}>
                <p className={styles.fact}>
                  <Icon name="chef-hat" size={18} />
                  Cooked after you order, not held under a heat lamp.
                </p>
                <p className={styles.fact}>
                  <Icon name="leaf" size={18} />
                  Allergens and ingredients are listed below. Ask us if you need more detail.
                </p>
                <p className={styles.fact}>
                  <Icon name="truck" size={18} />
                  Delivered in about {deliveryWindow(product.prepTimeMinutes)}.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.details}>
          <details className={styles.detail} open>
            <summary>
              About this dish
              <Icon name="chevron-down" size={18} />
            </summary>
            <div className={styles.detailBody}>
              <p>{product.description || product.shortDescription}</p>
            </div>
          </details>

          {product.ingredients?.length > 0 ? (
            <details className={styles.detail}>
              <summary>
                Ingredients
                <Icon name="chevron-down" size={18} />
              </summary>
              <div className={styles.detailBody}>
                <ul>
                  {product.ingredients.map((ingredient) => (
                    <li key={ingredient}>{ingredient}</li>
                  ))}
                </ul>
              </div>
            </details>
          ) : null}

          {product.allergens?.length > 0 ? (
            <details className={styles.detail}>
              <summary>
                Allergens
                <Icon name="chevron-down" size={18} />
              </summary>
              <div className={styles.detailBody}>
                <ul>
                  {product.allergens.map((allergen) => (
                    <li key={allergen}>{allergen}</li>
                  ))}
                </ul>
              </div>
            </details>
          ) : null}

          {nutrition.length > 0 ? (
            <details className={styles.detail}>
              <summary>
                Nutrition
                <Icon name="chevron-down" size={18} />
              </summary>
              <div className={styles.detailBody}>
                <div className={styles.nutritionGrid}>
                  {nutrition.map(([label, value, unit]) => (
                    <div className={styles.nutritionCell} key={label}>
                      <span className={styles.nutritionLabel}>{label}</span>
                      <span className={styles.nutritionValue}>
                        {value}
                        {unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </details>
          ) : null}
        </div>

        <ProductReviews productId={product.id} product={product} />
      </div>

      {related.length > 0 ? (
        <ProductRail
          eyebrow="Keep exploring"
          title="You might also like"
          products={related.slice(0, 4)}
          skeletonCount={4}
        />
      ) : null}
    </div>
  );
};

export default ProductPage;
