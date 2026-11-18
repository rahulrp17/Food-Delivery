import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { formatINR } from "../../lib/format";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
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
  const wishlist = useWishlist();
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const Heading = headingLevel;

  const soldOut = !product.isAvailable || product.stock <= 0;
  const inCart = items.find((item) => item.productId === product.id);
  const inCartQuantity = inCart?.quantity || 0;
  const cartBusy = isUpdating && inCartQuantity > 0;

  const saved = wishlist.isWishlisted(product.id);
  const wishlistBusy = wishlist.isPendingFor(product.id);

  const discountPercent =
    product.compareAtPricePaise > product.pricePaise
      ? Math.round(
          ((product.compareAtPricePaise - product.pricePaise) / product.compareAtPricePaise) * 100
        )
      : 0;

  const prepMinutes = Number(product.prepTimeMinutes);
  const prepTime = Number.isFinite(prepMinutes) && prepMinutes > 0 ? Math.round(prepMinutes) : null;

  const statusBadge = soldOut
    ? { tone: "soldOut", label: "Sold out" }
    : product.isBestseller
      ? { tone: "bestseller", label: "Bestseller" }
      : product.isNew
        ? { tone: "new", label: "New" }
        : null;

  const handleAddToCart = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!soldOut) {
      addItem(product.id, 1);
    }
  };

  const handleWishlist = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (wishlist.toggle(product) === "auth") {
      navigate("/login", { state: { from: location } });
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

        <div className={styles.topChips}>
          {product.ratingCount > 0 ? (
            <span
              className={styles.ratingPill}
              role="img"
              aria-label={`Rated ${product.ratingAvg.toFixed(1)} out of 5 from ${
                product.ratingCount === 1 ? "1 review" : `${product.ratingCount} reviews`
              }`}
            >
              <Icon name="star-filled" size={11} />
              <span>{product.ratingAvg.toFixed(1)}</span>
              <span className={styles.ratingCount}>
                ({product.ratingCount > 999
                  ? `${(product.ratingCount / 1000).toFixed(1)}k`
                  : product.ratingCount})
              </span>
            </span>
          ) : null}

          {statusBadge || discountPercent > 0 ? (
            <div className={styles.badges}>
              {statusBadge ? (
                <Badge tone={statusBadge.tone}>{statusBadge.label}</Badge>
              ) : null}
              {discountPercent > 0 ? (
                <span className={styles.discount}>
                  <Icon name="tag" size={11} />
                  {discountPercent}% off
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={`${styles.wishlist} ${saved ? styles.wishlistSaved : ""}`.trim()}
          onClick={handleWishlist}
          disabled={wishlistBusy}
          aria-pressed={saved}
          aria-label={
            saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`
          }
          title={saved ? "Remove from wishlist" : "Save to wishlist"}
        >
          <Icon name="heart" size={17} />
        </button>

        {prepTime ? (
          <span className={styles.prepPill} aria-label={`Ready in about ${prepTime} minutes`}>
            <Icon name="clock" size={11} />
            {prepTime} min
          </span>
        ) : null}
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
                aria-label={
              soldOut ? "Sold out" : isAdding ? `Adding ${product.name} to cart` : `Add ${product.name} to cart`
            }
                aria-busy={isAdding || undefined}
                whileHover={reduceMotion ? undefined : { y: -1.5 }}
                whileTap={reduceMotion ? undefined : { scale: 0.97 }}
                transition={{ duration: 0.15 }}
              >
                {isAdding ? (
                  <Icon name="spinner" size={16} className="spinner-animate" />
                ) : (
                  <Icon name="plus" size={16} />
                )}
                <span>{soldOut ? "Sold out" : isAdding ? "Adding" : "Add"}</span>
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
