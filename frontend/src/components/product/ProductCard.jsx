import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { deliveryWindow, formatINR } from "../../lib/format";
import { useCart } from "../../hooks/useCart";
import Badge from "../ui/Badge";
import Icon from "../ui/Icon";
import SmartImage from "../ui/SmartImage";
import styles from "./ProductCard.module.css";

/**
 * `headingLevel` lets a page choose the card title's heading level so the
 * document outline never skips a level. It is `h3` when the card sits inside
 * a section that owns the `h2` (the home rails) and `h2` when the grid is a
 * direct child of the page heading (the menu and search results).
 */
const ProductCard = ({ product, dense = false, headingLevel = "h3" }) => {
  const { addItem, isAdding, items, updateQuantity, removeItem, isUpdating } = useCart();
  const reduceMotion = useReducedMotion();
  const Heading = headingLevel;

  const soldOut = !product.isAvailable || product.stock <= 0;
  const inCart = items.find((item) => item.productId === product.id);
  const inCartQuantity = inCart?.quantity || 0;
  const cartBusy = isUpdating && inCartQuantity > 0;

  const discountPercent =
    product.compareAtPricePaise > product.pricePaise
      ? Math.round(
          ((product.compareAtPricePaise - product.pricePaise) / product.compareAtPricePaise) * 100
        )
      : 0;

  const badges = [];

  if (product.isBestseller) {
    badges.push(<Badge key="bestseller" tone="bestseller">Bestseller</Badge>);
  } else if (product.isNew) {
    badges.push(<Badge key="new" tone="new">New</Badge>);
  }

  if (soldOut) {
    badges.push(<Badge key="soldout" tone="soldOut">Sold out</Badge>);
  }

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!soldOut) {
      addItem(product.id, 1);
    }
  };

  const handleIncrement = (event) => {
    event.preventDefault();
    event.stopPropagation();
    updateQuantity(product.id, inCartQuantity + 1);
  };

  const handleDecrement = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (inCartQuantity <= 1) removeItem(product.id);
    else updateQuantity(product.id, inCartQuantity - 1);
  };

  return (
    <article
      className={`${styles.card} ${dense ? styles.dense : ""} ${soldOut ? styles.soldOut : ""}`.trim()}
    >
      <Link
        to={`/product/${product.slug}`}
        className={styles.overlay}
        aria-label={`View ${product.name}`}
      />

      <div className={styles.media}>
        <SmartImage
          src={product.image?.url}
          alt={product.name}
          ratio="4 / 3"
          className={styles.mediaFrame}
          imageClassName={styles.imageEl}
        />

        <span className={styles.scrim} aria-hidden="true" />

        {badges.length ? <div className={styles.badges}>{badges.slice(0, 1)}</div> : null}

        {discountPercent > 0 ? (
          <span className={styles.discount}>
            <Icon name="tag" size={12} />
            {discountPercent}% off
          </span>
        ) : null}

        {product.ratingCount > 0 ? (
          <span className={styles.ratingPill}>
            <Icon name="star-filled" size={12} />
            <span className={styles.ratingValue}>{product.ratingAvg.toFixed(1)}</span>
            <span className={styles.ratingCount}>
              ({product.ratingCount > 999 ? `${(product.ratingCount / 1000).toFixed(1)}k` : product.ratingCount})
            </span>
          </span>
        ) : null}

        <span className={styles.deliveryPill}>
          <Icon name="clock" size={12} />
          {deliveryWindow(product.prepTimeMinutes)}
        </span>
      </div>

      <div className={styles.body}>
        <div className={styles.meta}>
          <span
            className={`${styles.dietMark} ${product.isVeg ? styles.dietVeg : styles.dietNonVeg}`}
            title={product.isVeg ? "Vegetarian" : "Non-vegetarian"}
          >
            <span className={styles.dietDot} aria-hidden="true" />
            <span className="visually-hidden">
              {product.isVeg ? "Vegetarian" : "Non-vegetarian"}
            </span>
          </span>
          <span className={styles.category}>
            {product.category?.name || "Kitchen fresh"}
          </span>
          <span className={styles.ratingInline}>
            <Icon name="star-filled" size={12} />
            {product.ratingAvg.toFixed(1)}
          </span>
        </div>

        <Heading className={styles.title}>{product.name}</Heading>

        {product.shortDescription ? (
          <p className={styles.description}>{product.shortDescription}</p>
        ) : null}

        <div className={styles.footer}>
          <div className={styles.prices}>
            <span className={styles.price}>{formatINR(product.pricePaise)}</span>
            {product.compareAtPricePaise > product.pricePaise ? (
              <span className={styles.compare}>
                {formatINR(product.compareAtPricePaise)}
              </span>
            ) : null}
          </div>

          <div className={styles.actions}>
            {inCartQuantity > 0 ? (
              /* Once a dish is in the basket the button becomes a stepper, so
                 the quantity can be adjusted without opening the cart. */
              <div
                className={styles.stepper}
                role="group"
                aria-label={`Quantity for ${product.name}`}
              >
                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={handleDecrement}
                  disabled={cartBusy}
                  aria-label={
                    inCartQuantity <= 1
                      ? `Remove ${product.name} from cart`
                      : `Decrease ${product.name} quantity`
                  }
                >
                  <Icon name={inCartQuantity <= 1 ? "trash" : "minus"} size={15} />
                </button>

                <motion.span
                  className={styles.stepperValue}
                  key={inCartQuantity}
                  aria-live="polite"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                >
                  {inCartQuantity}
                </motion.span>

                <button
                  type="button"
                  className={styles.stepperBtn}
                  onClick={handleIncrement}
                  disabled={cartBusy || soldOut}
                  aria-label={`Increase ${product.name} quantity`}
                >
                  <Icon name="plus" size={15} />
                </button>
              </div>
            ) : (
              <motion.button
                type="button"
                className={`${styles.addToCart} ${soldOut ? styles.disabled : ""}`.trim()}
                onClick={handleAddToCart}
                disabled={soldOut || isAdding}
                aria-label={soldOut ? "Sold out" : `Add ${product.name} to cart`}
                aria-busy={isAdding || undefined}
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                {isAdding ? (
                  <Icon name="spinner" size={18} className="spinner-animate" />
                ) : (
                  <Icon name="plus" size={18} />
                )}
                <span>{isAdding ? "Adding" : "Add"}</span>
              </motion.button>
            )}

            {!dense ? (
              <Link
                to={`/product/${product.slug}`}
                className={styles.view}
                tabIndex={-1}
                aria-label={`View ${product.name}`}
              >
                <Icon name="arrow-up-right" size={17} />
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
