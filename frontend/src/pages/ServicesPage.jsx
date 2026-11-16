import { Link } from "react-router-dom";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import heroImage from "../assets/food_7.webp";
import styles from "../components/marketing/MarketingPage.module.css";

const SERVICES = [
  {
    icon: "truck",
    iconTone: "",
    title: "On-demand delivery",
    body: "The everyday service: order in under a minute, pick a delivery window, and eat within the half hour.",
    points: [
      "Delivery in 25–30 minutes",
      "Live tracking from kitchen to door",
      "Free delivery over ₹499",
    ],
    cta: { to: "/menu", label: "Start an order" },
  },
  {
    icon: "package",
    iconTone: "cardIconAccent",
    title: "Party & event catering",
    body: "For birthdays, office lunches and everything in between — set menus for ten to a hundred, cooked fresh and delivered to your venue.",
    points: [
      "Set menus for 10–100 guests",
      "Delivered to your venue, set up",
      "Vegetarian, Jain and non-veg options",
    ],
    cta: { to: "/contact", label: "Plan an event" },
  },
  {
    icon: "clock",
    iconTone: "cardIconSuccess",
    title: "Weekly subscriptions",
    body: "Pick a bowl, pick a day, and stop thinking about lunch. Pause or skip any week without a fee.",
    points: [
      "Pause or skip any week",
      "10% saved on every recurring order",
      "Same chef, same portion, every time",
    ],
    cta: { to: "/menu", label: "Build a subscription" },
  },
  {
    icon: "truck",
    iconTone: "",
    title: "Corporate & bulk orders",
    body: "Desk lunches, team offsites and shift changes at scale, with one invoice and a single delivery slot.",
    points: [
      "Single consolidated invoice",
      "Scheduled delivery slots",
      "Invoicing with GST details",
    ],
    cta: { to: "/contact", label: "Talk to sales" },
  },
  {
    icon: "truck",
    iconTone: "cardIconSuccess",
    title: "Chef & cloud-kitchen partnerships",
    body: "For food businesses with a great dish and no delivery operation — we handle the last mile and the customers.",
    points: [
      "We bring the delivery network",
      "Your food stays yours",
      "No exclusivity, no lock-in",
    ],
    cta: { to: "/contact", label: "Partner with us" },
  },
  {
    icon: "leaf",
    iconTone: "cardIconAccent",
    title: "Dietary & wellness",
    body: "High-protein bowls, Jain-friendly kitchens, and calorie-counted meals that still taste like dinner.",
    points: [
      "High-protein and low-carb bowls",
      "Jain-friendly preparation",
      "Calories shown on every dish",
    ],
    cta: { to: "/menu?veg=true", label: "See the picks" },
  },
];

const PLANS = [
  {
    name: "Everyday",
    price: "₹149",
    note: "per delivery, free over ₹499",
    featured: false,
    points: [
      "One dish, cooked to order",
      "25–30 minute delivery window",
      "Live order tracking",
      "FSSAI licensed kitchen",
    ],
  },
  {
    name: "Subscriber",
    price: "₹119",
    note: "per delivery, on a weekly plan",
    featured: true,
    points: [
      "Everything in Everyday",
      "10% off every recurring order",
      "Skip or pause any week",
      "Your regular, saved",
    ],
  },
  {
    name: "Gathering",
    price: "₹1,490",
    note: "for up to 10 guests, delivered",
    featured: false,
    points: [
      "Set menu for ten guests",
      "Delivered to your venue",
      "Chafing dishes included",
      "One invoice, GST details",
    ],
  },
];

const ServicesPage = () => {
  useDocumentTitle("Services");

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <img
          className={styles.heroImage}
          src={heroImage}
          alt="A freshly cooked dish packed and ready to be delivered"
          loading="eager"
          fetchPriority="high"
        />
        <span className={styles.heroScrim} aria-hidden="true" />

        <div className="container">
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>
              <Icon name="sparkles" size={13} />
              What we do
            </span>

            <h1 className={styles.heroTitle}>Delivery for every kind of order.</h1>

            <p className={styles.heroLead}>
              Most of us order for one person on a Tuesday. Some of us feed a
              team, need a set menu for an occasion, or want the same lunch
              every day for a month. It is the same kitchen either way — only
              the size of the order changes.
            </p>

            <p className={styles.heroLead}>
              Foodie is a delivery-only kitchen. We cook, we pack and we bring
              it to your door — we never seat guests.
            </p>

            <div className={styles.heroActions}>
              <Button to="/menu" size="lg" iconRight={<Icon name="arrow-right" size={18} />}>
                Order for one
              </Button>
              <Button to="/contact" variant="glass" size="lg">
                Plan a larger order
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <section className={styles.section} aria-labelledby="services-list">
          <div className={styles.sectionHead}>
            <span className={styles.sectionEyebrow}>Services</span>
            <h2 className={styles.sectionTitle} id="services-list">
              Six ways to order from us
            </h2>
            <p className={styles.sectionLead}>
              Every service runs on the same ingredients, the same kitchen and
              the same delivery network.
            </p>
          </div>

          <div className={styles.grid}>
            {SERVICES.map((service) => (
              <article className={styles.card} key={service.title}>
                <span className={`${styles.cardIcon} ${styles[service.iconTone] || ""}`.trim()}>
                  <Icon name={service.icon} size={22} />
                </span>

                <h3 className={styles.cardTitle}>{service.title}</h3>
                <p className={styles.cardBody}>{service.body}</p>

                <ul className={styles.cardList}>
                  {service.points.map((point) => (
                    <li key={point}>
                      <Icon name="check" size={15} />
                      {point}
                    </li>
                  ))}
                </ul>

                <Link to={service.cta.to} className={styles.cardCta}>
                  {service.cta.label}
                  <Icon name="arrow-right" size={16} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="services-plans">
          <div className={styles.sectionHead}>
            <span className={styles.sectionEyebrow}>Plans</span>
            <h2 className={styles.sectionTitle} id="services-plans">
              Simple pricing, no hidden lines
            </h2>
            <p className={styles.sectionLead}>
              Taxes are included. There is no small order fee and no surge
              pricing at peak hours.
            </p>
          </div>

          <div className={styles.plans}>
            {PLANS.map((plan) => (
              <article
                className={`${styles.plan} ${plan.featured ? styles.planFeatured : ""}`.trim()}
                key={plan.name}
              >
                {plan.featured ? (
                  <span className={styles.planBadge}>Most popular</span>
                ) : null}

                <h3 className={styles.planName}>{plan.name}</h3>
                <span className={styles.planPrice}>{plan.price}</span>
                <span className={styles.planNote}>{plan.note}</span>

                <ul className={styles.cardList}>
                  {plan.points.map((point) => (
                    <li key={point}>
                      <Icon name="check" size={15} />
                      {point}
                    </li>
                  ))}
                </ul>

                <Link to="/menu" className={styles.cardCta}>
                  Choose {plan.name}
                  <Icon name="arrow-right" size={16} />
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.cta}>
          <div>
            <h2 className={styles.ctaTitle}>Need something larger?</h2>
            <p className={styles.ctaText}>
              Tell us the date, the headcount and the occasion. We will send a
              written quote within one working day.
            </p>
          </div>

          <div className={styles.ctaActions}>
            <Button to="/contact" size="lg" iconRight={<Icon name="arrow-right" size={18} />}>
              Request a quote
            </Button>
            <Button to="/services" variant="secondary" size="lg">
              All services
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ServicesPage;
