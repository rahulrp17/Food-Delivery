import { motion, useReducedMotion } from "motion/react";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import styles from "./OfferBand.module.css";

const OfferBand = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className={`container ${styles.band}`} aria-labelledby="offer-title">
      <motion.div
        className={styles.inner}
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className={styles.copy}>
          <span className={`eyebrow ${styles.eyebrow}`}>A small thank you</span>
          <h2 id="offer-title" className={styles.title}>
            Free delivery when your order reaches ₹499.
          </h2>
          <p className={styles.description}>
            No code to remember. The discount is applied automatically at checkout
            when your subtotal qualifies.
          </p>
          <Button to="/menu" variant="accent" iconRight={<Icon name="arrow-right" size={18} />}>
            Build your order
          </Button>
        </div>

        <div className={styles.visual} aria-hidden="true">
          <div className={styles.ticket}>
            <span className={styles.ticketIcon}>
              <Icon name="truck" size={24} />
            </span>
            <span>
              <span className={styles.ticketLabel}>Delivery on us</span>
              <span className={styles.ticketValue}>Orders ₹499+</span>
              <span className={styles.ticketMeta}>Applied automatically · no code</span>
            </span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default OfferBand;
