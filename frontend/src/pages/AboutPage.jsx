import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import heroImage from "../assets/food_5.webp";
import kitchenImage from "../assets/food_4.webp";
import styles from "../components/marketing/MarketingPage.module.css";

const STATS = [
  { value: "12", label: "Years delivering across Bengaluru" },
  { value: "40+", label: "Dishes on the menu today" },
  { value: "4.8", label: "Average customer rating" },
  { value: "28 min", label: "Average door-to-door time" },
];

const VALUES = [
  {
    icon: "leaf",
    title: "Ingredients before anything else",
    body: "We buy from the same four growers and two fishmongers every week. If it is not good enough to feed our own families, it does not go on the menu.",
  },
  {
    icon: "chef-hat",
    title: "Cooked when you order it",
    body: "Nothing sits under a heat lamp. The moment an order lands, the dish is started — which is why the kitchen is busiest in the ten minutes after the rush starts.",
  },
  {
    icon: "clock",
    title: "Honest about the wait",
    body: "The delivery window on your order is the real one. If a dish needs longer, we tell you before you ask, rather than sending you a surprise.",
  },
  {
    icon: "shield-check",
    title: "Safety is not negotiable",
    body: "FSSAI licensed kitchen, chilled supply chain, and a sealed tamper-evident bag on every single order that leaves the pass.",
  },
  {
    icon: "truck",
    title: "Delivery only, by design",
    body: "There is no dining room and no seating. We are a kitchen that cooks and a fleet that delivers — and we are better at both because we only do those two things.",
  },
];

const STEPS = [
  {
    title: "We order at 5am",
    body: "The kitchen manager walks the market before sunrise and picks the day's vegetables, eggs and fish by hand. What is not good enough is left behind.",
  },
  {
    title: "The prep happens before you order",
    body: "Marinating, chopping and stock are done in the morning. What is cooked to order is the food itself — not the preparation of it.",
  },
  {
    title: "Your order starts the pan",
    body: "Every dish is cooked after it is placed. The pass is timed to the delivery rider, so the food and the rider arrive together.",
  },
  {
    title: "It leaves, sealed and tracked",
    body: "The bag is sealed and labelled with your name and the dish, so the rider and the kitchen never mix up four different orders.",
  },
];

const AboutPage = () => {
  useDocumentTitle("About us");

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <img
          className={styles.heroImage}
          src={heroImage}
          alt="A freshly cooked savoury dish ready to be packed for delivery"
          loading="eager"
          fetchPriority="high"
        />
        <span className={styles.heroScrim} aria-hidden="true" />

        <div className="container">
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>
              <Icon name="sparkles" size={13} />
              Our kitchen
            </span>

            <h1 className={styles.heroTitle}>
              Good food should never be complicated.
            </h1>

            <p className={styles.heroLead}>
              Foodie started as one kitchen on a Bengaluru side street with six
              dishes and a hand-written list on the wall. We still cook the same
              way — short menu, honest ingredients, cooked only once you order
              it. The only thing that has changed is how quickly it reaches your
              door.
            </p>

            <div className={styles.heroActions}>
              <Button
                to="/menu"
                size="lg"
                iconRight={<Icon name="arrow-right" size={18} />}
              >
                See the menu
              </Button>
              <Button to="/services" variant="glass" size="lg">
                Our services
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container mt-10">
        <dl className={styles.stats}>
          {STATS.map((stat) => (
            <div className={styles.stat} key={stat.label}>
              <dt className={styles.statLabel}>{stat.label}</dt>
              <dd className={styles.statValue}>{stat.value}</dd>
            </div>
          ))}
        </dl>

        <section className={styles.section} aria-labelledby="about-values">
          <div className={styles.sectionHead}>
            <span className={styles.sectionEyebrow}>What we believe</span>
            <h2 className={styles.sectionTitle} id="about-values">
              Four things we will not compromise on
            </h2>
            <p className={styles.sectionLead}>
              Everything else on this site can change. These four have not
              changed since the first day.
            </p>
          </div>

          <ul className={styles.values}>
            {VALUES.map((value) => (
              <li className={styles.value} key={value.title}>
                <span className={styles.valueIcon}>
                  <Icon name={value.icon} size={20} />
                </span>
                <span>
                  <span className={styles.valueTitle}>{value.title}</span>
                  <span className={styles.valueBody}>{value.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="about-journey">
          <div className={styles.sectionHead}>
            <span className={styles.sectionEyebrow}>How it works</span>
            <h2 className={styles.sectionTitle} id="about-journey">
              From the market to your door
            </h2>
            <p className={styles.sectionLead}>
              A single dish travels through four stages before it reaches you.
              Here is the whole journey.
            </p>
          </div>

          <ol className={styles.sequence}>
            {STEPS.map((step, index) => (
              <li className={styles.step} key={step.title}>
                <span className={styles.stepNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>
                  <span className={styles.stepTitle}>{step.title}</span>
                  <span className={styles.stepBody}>{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="about-kitchen">
          <div className={styles.split}>
            <div className={styles.splitMedia}>
              <img
                src={kitchenImage}
                alt="A freshly chopped salad of greens and vegetables"
                loading="lazy"
              />
            </div>

            <div>
              <div className={styles.sectionHead}>
                <span className={styles.sectionEyebrow}>The kitchen</span>
                <h2 className={styles.sectionTitle} id="about-kitchen">
                  Small menu, very high standards
                </h2>
                <p className={styles.sectionLead}>
                  Most kitchens grow by adding dishes. We grow by making the
                  ones we have impossible to order badly. Forty dishes is enough
                  to cover every craving, and few enough that the kitchen can
                  hold itself to a standard on all of them.
                </p>
                <p className={styles.sectionLead}>
                  Every dish on the menu has been cooked by the head chef at
                  least fifty times before it goes live. That is why there are
                  no seasonal specials, and why the menu you see today is the
                  menu you will see next month.
                </p>
              </div>

              <Link to="/menu" className={styles.cardCta}>
                Browse what we cook
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          </div>
        </section>

        <section className={styles.cta}>
          <div>
            <h2 className={styles.ctaTitle}>Hungry already?</h2>
            <p className={styles.ctaText}>
              The kitchen is open from 11 in the morning to 11 at night, and the
              menu is live right now.
            </p>
          </div>

          <div className={styles.ctaActions}>
            <Button
              to="/menu"
              size="lg"
              iconRight={<Icon name="arrow-right" size={18} />}
            >
              Order now
            </Button>
            <Button to="/contact" variant="secondary" size="lg">
              Contact us
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
