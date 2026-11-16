import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useCart } from "../../hooks/useCart";
import { formatINR, pluralize } from "../../lib/format";
import Icon from "../ui/Icon";
import "./CartBar.css";

/**
 * Sticky cart bar.
 *
 * The single most recognisable pattern of a food-ordering platform: once the
 * basket holds something, a persistent bar sits at the bottom of the viewport
 * with the running total and a checkout call to action, so the customer never
 * has to scroll back to the header to reach their order.
 *
 * It is deliberately hidden on desktop (where the header already carries the
 * cart) and on the cart and checkout pages themselves.
 */
export default function CartBar({ hiddenPaths = [] }) {
  const { items, pricing } = useCart();
  const reduceMotion = useReducedMotion();
  const location = useLocation();

  const count = items.reduce((total, item) => total + item.quantity, 0);
  const total = pricing?.totalPaise ?? 0;
  const visible = count > 0 && !hiddenPaths.some((path) => location.pathname.startsWith(path));

  return (
    <>
      <AnimatePresence>
        {visible ? (
          <motion.div
            className="cart-bar"
            role="region"
            aria-label="Your basket"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 80 }}
            transition={{ duration: reduceMotion ? 0.15 : 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link to="/cart" className="cart-bar-summary">
              <span className="cart-bar-count">
                <Icon name="shopping-bag" size={17} />
                {count} {pluralize(count, "item")}
              </span>
              <span className="cart-bar-total">{formatINR(total)}</span>
            </Link>

            <Link to="/checkout" className="cart-bar-cta">
              Checkout
              <Icon name="arrow-right" size={17} />
            </Link>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Reserves the room the fixed bar occupies so the last card is never
          hidden behind it. */}
      {visible ? <div className="cart-bar-spacer" aria-hidden="true" /> : null}
    </>
  );
}
