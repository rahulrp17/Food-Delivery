import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import { formatINR } from "../../lib/format";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import heroFallback from "../../assets/food_5.webp";
import heroDish from "../../assets/food_26.webp";
import styles from "./Hero.module.css";

const reviews = [
  { initials: "AR", tone: "a" },
  { initials: "MK", tone: "b" },
  { initials: "SP", tone: "c" },
  { initials: "JD", tone: "d" },
];

const stats = [
  { value: "~30", label: "minute delivery" },
  { value: "5K+", label: "happy diners" },
  { value: "100%", label: "cooked to order" },
];

/**
 * The home masthead.
 *
 * A full-bleed photograph with the copy laid over it and the offer cards
 * in a rail beside the copy — never absolutely positioned against the
 * viewport, so nothing can be clipped or pushed off-screen.
 */
const Hero = ({ featured = [] }) => {
  const reduceMotion = useReducedMotion();
  const main = featured[2];

  const rise = (delay) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.26, delay, ease: [0.2, 0.8, 0.2, 1] },
        };

  return (
    <>
      <section className={styles.hero} aria-labelledby="hero-title">
        <img
          className={styles.heroImage}
          src={main?.image?.url || heroFallback}
          alt=""
          loading="eager"
          fetchPriority="high"
        />
        <span className={styles.heroScrim} aria-hidden="true" />

        <div className={`container ${styles.layout}`}>
          <div className={styles.copy}>
            <motion.span className={styles.eyebrow} {...rise(0)}>
              <Icon name="sparkles" size={14} />
              Fresh from the kitchen
            </motion.span>

            <motion.h1 id="hero-title" className={styles.title} {...rise(0.05)}>
              It&apos;s not just <em>food</em>, it&apos;s an experience.
            </motion.h1>

            <motion.p className={styles.promise} {...rise(0.1)}>
              Chef-made meals from a tight, seasonal menu. Cooked when you
              order, packed with care, and at your door in about half an hour.
            </motion.p>

            <motion.div className={styles.ctaRow} {...rise(0.15)}>
              <Button
                to="/menu"
                size="lg"
                className={styles.primaryCta}
                iconRight={<Icon name="arrow-right" size={18} />}
              >
                View menu
              </Button>
              <Button to="/search" size="lg" variant="glass">
                Search dishes
              </Button>
            </motion.div>

            <motion.div className={styles.reviews} {...rise(0.2)}>
              <div className={styles.avatars} aria-hidden="true">
                {reviews.map((review) => (
                  <span
                    key={review.initials}
                    className={`${styles.avatar} ${styles[`tone_${review.tone}`]}`}
                  >
                    {review.initials}
                  </span>
                ))}
                <span className={`${styles.avatar} ${styles.moreCount}`}>5K+</span>
              </div>
              <div className={styles.reviewMeta}>
                <div className={styles.stars} aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Icon key={star} name="star-filled" size={16} />
                  ))}
                </div>
                <p className={styles.reviewText}>Loved by 5,000+ happy diners</p>
              </div>
            </motion.div>
          </div>

          {/* The offer cards live in a column beside the copy rather than
              being positioned against the viewport, so they can never be
              clipped or pushed off-screen. */}
          <motion.div className={styles.rail} {...rise(0.25)}>
            <figure className={styles.heroPlate}>
              <img
                className={styles.heroPlateImage}
                src={heroDish}
                alt="A bowl of tomato penne pasta, ready to serve"
                loading="lazy"
              />
              <figcaption className={styles.heroPlateCaption}>
                <Icon name="sparkles" size={13} />
                Cooked to order, packed hot
              </figcaption>
            </figure>

            <div className={styles.railCards}>
              <div className={styles.offerCard}>
                <span className={styles.offerIcon}>
                  <Icon name="tag" size={18} />
                </span>
                <span className={styles.offerText}>
                  <span className={styles.offerValue}>5% off</span>
                  <span className={styles.offerMeta}>your first order</span>
                </span>
              </div>

              {main ? (
                <div className={styles.pickCard}>
                  <span className={styles.pickIcon}>
                    <Icon name="star-filled" size={16} />
                  </span>
                  <span className={styles.pickText}>
                    <span className={styles.pickLabel}>Tonight&apos;s pick</span>
                    <span className={styles.pickName}>{main.name}</span>
                    <span className={styles.pickPrice}>
                      {formatINR(main.pricePaise)} · {main.prepTimeMinutes} min
                    </span>
                  </span>
                </div>
              ) : null}
            </div>
          </motion.div>
        </div>
      </section>

      {/* The stat band is a sibling of the hero, so it can straddle the
          foot of the photograph without the hero clipping it. */}
      <div className={`container ${styles.statBand}`}>
        <motion.dl className={styles.stats} {...rise(0.3)}>
          {stats.map((stat) => (
            <div className={styles.stat} key={stat.label}>
              <dt className={styles.statValue}>{stat.value}</dt>
              <dd className={styles.statLabel}>{stat.label}</dd>
            </div>
          ))}
        </motion.dl>

        <div className={styles.footNote}>
          <Link to="/menu" className={styles.footLink}>
            Explore the full menu
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </div>
    </>
  );
};

export default Hero;
