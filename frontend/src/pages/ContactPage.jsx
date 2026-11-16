import { useState } from "react";
import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { focusFirstInvalidField } from "../lib/validation/forms";
import heroImage from "../assets/food_3.webp";
import styles from "../components/marketing/MarketingPage.module.css";

const TOPICS = [
  "An order that went wrong",
  "Catering or a large delivery",
  "A subscription enquiry",
  "Partnering with Foodie",
  "Something else",
];

const CONTACT_EMAIL = "hello@foodie.example";

const CHANNELS = [
  {
    icon: "mail",
    title: "Email us",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
  },
  {
    icon: "clock",
    title: "Kitchen hours",
    value: "11:00 AM – 11:00 PM, every day",
  },
  {
    icon: "map-pin",
    title: "Where we are",
    value: "Bengaluru, India",
  },
  {
    icon: "truck",
    title: "Delivery areas",
    value: "Across central Bengaluru, 7 days a week",
  },
];

const emptyForm = { name: "", email: "", topic: TOPICS[0], message: "" };

/**
 * Contact page.
 *
 * There is no message endpoint behind this form, so rather than pretend a
 * message was delivered, the form validates the details and hands them to the
 * visitor's mail client — the message genuinely reaches the kitchen, and the
 * visitor sees exactly what happens next.
 */
const ContactPage = () => {
  useDocumentTitle("Contact us");

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const handleChange = (field, value) => {
    setForm((previous) => ({ ...previous, [field]: value }));
    if (errors[field]) setErrors((previous) => ({ ...previous, [field]: undefined }));
    if (sent) setSent(false);
  };

  const validate = () => {
    const next = {};

    if (!form.name.trim()) {
      next.name = "Tell us your name";
    }

    if (!form.email.trim()) {
      next.email = "We need an email to reply to";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      next.email = "That email address does not look right";
    }

    if (!form.message.trim()) {
      next.message = "Let us know how we can help";
    } else if (form.message.trim().length < 10) {
      next.message = "A little more detail helps us answer properly";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!validate()) {
      focusFirstInvalidField();
      return;
    }

    const subject = `Foodie enquiry — ${form.topic}`;
    const body = [
      `Name: ${form.name.trim()}`,
      `Email: ${form.email.trim()}`,
      `Topic: ${form.topic}`,
      "",
      form.message.trim(),
    ].join("\n");

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    setSent(true);
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <img
          className={styles.heroImage}
          src={heroImage}
          alt="A freshly prepared salad from the Foodie kitchen"
          loading="eager"
          fetchPriority="high"
        />
        <span className={styles.heroScrim} aria-hidden="true" />

        <div className="container">
          <div className={styles.heroCopy}>
            <span className={styles.heroEyebrow}>
              <Icon name="mail" size={13} />
              Get in touch
            </span>

            <h1 className={styles.heroTitle}>Talk to a human, not a queue.</h1>

            <p className={styles.heroLead}>
              Whether an order went wrong, you are planning thirty people for
              dinner, or you want to bring your dish to our kitchen — write to
              us. A real person reads every message, and the kitchen replies
              within one working day.
            </p>

            <div className={styles.heroActions}>
              <Button
                to="#contact-form"
                variant="glass"
                size="lg"
                iconRight={<Icon name="arrow-right" size={18} />}
              >
                Send a message
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        <div className={styles.channelBand}>
          {CHANNELS.map((channel) =>
            channel.href ? (
              <a
                key={channel.title}
                href={channel.href}
                className={styles.infoCard}
                rel="noopener"
              >
                <span className={styles.infoIcon}>
                  <Icon name={channel.icon} size={18} />
                </span>
                <span>
                  <span className={styles.infoTitle}>{channel.title}</span>
                  <span className={styles.infoValue}>{channel.value}</span>
                </span>
              </a>
            ) : (
              <div key={channel.title} className={styles.infoCard}>
                <span className={styles.infoIcon}>
                  <Icon name={channel.icon} size={18} />
                </span>
                <span>
                  <span className={styles.infoTitle}>{channel.title}</span>
                  <span className={styles.infoValue}>{channel.value}</span>
                </span>
              </div>
            )
          )}
        </div>

        <section className={styles.section} id="contact-form" aria-labelledby="contact-heading">
          <div className={styles.contactLayout}>
            <form className={styles.formCard} onSubmit={handleSubmit} noValidate>
              <div>
                <span className={styles.sectionEyebrow}>Write to us</span>
                <h2 className={styles.sectionTitle} id="contact-heading">
                  Send us a message
                </h2>
              </div>

              {sent ? (
                <div className={styles.formSuccess} role="status">
                  <Icon name="check" size={18} aria-hidden="true" />
                  <span>
                    Your mail app should now be open with the message ready to
                    send. If nothing opened, email us at {CONTACT_EMAIL}.
                  </span>
                </div>
              ) : null}

              <div className={styles.formRow}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="contact-name">
                    Your name
                  </label>
                  <input
                    id="contact-name"
                    name="name"
                    type="text"
                    className={`${styles.input} ${errors.name ? styles.hasError : ""}`.trim()}
                    value={form.name}
                    onChange={(event) => handleChange("name", event.target.value)}
                    placeholder="Your name"
                    autoComplete="name"
                    aria-invalid={errors.name ? "true" : undefined}
                  />
                  {errors.name ? (
                    <span className={styles.fieldError} role="alert">
                      {errors.name}
                    </span>
                  ) : null}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="contact-email">
                    Email address
                  </label>
                  <input
                    id="contact-email"
                    name="email"
                    type="email"
                    className={`${styles.input} ${errors.email ? styles.hasError : ""}`.trim()}
                    value={form.email}
                    onChange={(event) => handleChange("email", event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    aria-invalid={errors.email ? "true" : undefined}
                  />
                  {errors.email ? (
                    <span className={styles.fieldError} role="alert">
                      {errors.email}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="contact-topic">
                  What is it about?
                </label>
                <select
                  id="contact-topic"
                  name="topic"
                  className={styles.input}
                  value={form.topic}
                  onChange={(event) => handleChange("topic", event.target.value)}
                >
                  {TOPICS.map((topic) => (
                    <option key={topic} value={topic}>
                      {topic}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="contact-message">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  name="message"
                  className={`${styles.input} ${styles.textarea} ${
                    errors.message ? styles.hasError : ""
                  }`.trim()}
                  value={form.message}
                  onChange={(event) => handleChange("message", event.target.value)}
                  placeholder="Tell us what you need, and include your order number if it is about an order."
                  rows={5}
                  aria-invalid={errors.message ? "true" : undefined}
                />
                {errors.message ? (
                  <span className={styles.fieldError} role="alert">
                    {errors.message}
                  </span>
                ) : null}
              </div>

              <Button type="submit" size="lg" iconRight={<Icon name="arrow-right" size={18} />}>
                Send message
              </Button>

              <p className={styles.formNote}>
                This opens your email app with everything filled in, so you can
                review it before it leaves. We reply within one working day.
              </p>
            </form>

            <div>
              <div className={styles.sectionHead}>
                <span className={styles.sectionEyebrow}>Before you write</span>
                <h2 className={styles.sectionTitle}>Faster answers</h2>
                <p className={styles.sectionLead}>
                  Most questions are already covered by the kitchen itself.
                </p>
              </div>

              <ul className={styles.values}>
                <li className={styles.value}>
                  <span className={styles.valueIcon}>
                    <Icon name="package" size={20} />
                  </span>
                  <span>
                    <span className={styles.valueTitle}>Where is my order?</span>
                    <span className={styles.valueBody}>
                      Open My Orders and the live status is on the order itself.
                    </span>
                  </span>
                </li>
                <li className={styles.value}>
                  <span className={styles.valueIcon}>
                    <Icon name="ticket" size={20} />
                  </span>
                  <span>
                    <span className={styles.valueTitle}>A discount did not apply</span>
                    <span className={styles.valueBody}>
                      Coupons are applied in the cart, before checkout. Check the
                      coupon field on the cart page.
                    </span>
                  </span>
                </li>
                <li className={styles.value}>
                  <span className={styles.valueIcon}>
                    <Icon name="star" size={20} />
                  </span>
                  <span>
                    <span className={styles.valueTitle}>Reviewing a dish</span>
                    <span className={styles.valueBody}>
                      Reviews open once your order has been delivered, from the
                      dish page itself.
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ContactPage;
