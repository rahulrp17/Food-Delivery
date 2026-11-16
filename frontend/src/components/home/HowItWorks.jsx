import { motion, useReducedMotion } from "motion/react";
import Icon from "../ui/Icon";
import SectionHeading from "./SectionHeading";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    title: "Choose your food",
    description:
      "Browse a short menu of dishes we know how to cook well. Every item shows its prep time and price up front.",
  },
  {
    title: "We cook it fresh",
    description:
      "Your order goes to the kitchen when you place it. No heat lamps, no pre-packed trays waiting under a counter.",
  },
  {
    title: "We bring it over",
    description:
      "A rider picks it up hot and heads straight to you. Track the order from the kitchen to your door.",
  },
];

const HowItWorks = () => {
  const reduceMotion = useReducedMotion();

  return (
    <section className={`container ${styles.section}`} id="how-it-works" aria-label="How Foodie works">
      <SectionHeading
        eyebrow="How it works"
        title="Good food, without the guesswork."
        description="Three simple steps between you and dinner. No subscription, no hidden fees, no surprises at checkout."
      />

      <ol className={styles.list}>
        {steps.map((step, index) => (
          <motion.li
            className={styles.step}
            key={step.title}
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.25, delay: index * 0.07, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <span className={styles.number} aria-hidden="true">
              0{index + 1}
            </span>

            <div className={styles.copy}>
              <h3 className={styles.title}>{step.title}</h3>
              <p className={styles.description}>{step.description}</p>
            </div>

            <span className={styles.glyph} aria-hidden="true">
              <Icon
                name={index === 0 ? "search" : index === 1 ? "chef-hat" : "truck"}
                size={22}
              />
            </span>
          </motion.li>
        ))}
      </ol>
    </section>
  );
};

export default HowItWorks;
