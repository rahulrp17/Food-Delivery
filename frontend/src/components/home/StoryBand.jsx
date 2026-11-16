import { motion, useReducedMotion } from "motion/react";
import Icon from "../ui/Icon";
import Skeleton from "../ui/Skeleton";
import SmartImage from "../ui/SmartImage";
import styles from "./StoryBand.module.css";

const principles = [
  "A short menu, so every dish gets the attention it needs.",
  "Ingredients prepped the same day, never frozen for convenience.",
  "Packaging that keeps sauces separate and fried food crisp.",
];

const StoryBand = ({ image, imageAlt, loading = false }) => {
  const reduceMotion = useReducedMotion();

  return (
    <section className={`section section--dark ${styles.section}`} id="story">
      <div className={`container ${styles.layout}`}>
        <motion.div
          className={styles.media}
          initial={reduceMotion ? false : { opacity: 0, x: -14 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {loading || !image ? (
            <Skeleton height="auto" style={{ aspectRatio: "4 / 3", borderRadius: "24px" }} />
          ) : (
            <SmartImage
              src={image}
              alt={imageAlt || "A dish from the Foodie kitchen"}
              ratio="4 / 3"
              className={styles.image}
            />
          )}
          <div className={styles.caption}>
            <span className={styles.captionIcon}>
              <Icon name="chef-hat" size={20} />
            </span>
            <span>
              <span className={styles.captionTitle}>A kitchen with a short menu</span>
              <span className={styles.captionMeta}>Small batch · cooked to order</span>
            </span>
          </div>
        </motion.div>

        <motion.div
          className={styles.copy}
          initial={reduceMotion ? false : { opacity: 0, x: 14 }}
          whileInView={reduceMotion ? undefined : { opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.28, delay: 0.06, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <span className="eyebrow">Our kitchen</span>
          <h2 className={styles.title}>Fewer dishes. Better food.</h2>
          <p className={styles.lead}>
            We would rather cook a handful of things properly than a hundred things
            quickly. That is the whole idea behind Foodie: a focused menu, honest
            ingredients, and a kitchen that treats every order like the only one.
          </p>

          <ul className={styles.list}>
            {principles.map((principle) => (
              <li className={styles.item} key={principle}>
                <span className={styles.itemIcon}>
                  <Icon name="check" size={14} strokeWidth={2} />
                </span>
                {principle}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  );
};

export default StoryBand;
