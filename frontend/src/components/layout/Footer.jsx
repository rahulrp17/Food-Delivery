import { Link } from "react-router-dom";
import Icon from "../ui/Icon";
import Logo from "./Logo";
import styles from "./Footer.module.css";

const shopLinks = [
  { to: "/menu", label: "Full menu" },
  { to: "/menu?category=pure-veg", label: "Pure veg" },
  { to: "/menu?category=salad", label: "Salads" },
  { to: "/menu?category=deserts", label: "Desserts" },
];

const companyLinks = [
  { to: "/#how-it-works", label: "How it works" },
  { to: "/#story", label: "Our kitchen" },
  { to: "/menu", label: "This week's menu" },
];

const supportLinks = [
  { to: "/search", label: "Find a dish" },
  { to: "/menu?veg=true", label: "Vegetarian picks" },
  { to: "/menu?maxPricePaise=15000", label: "Everyday value" },
];

const Footer = () => (
  <footer className={styles.footer}>
    <div className={`container ${styles.top}`}>
      <div className={styles.brand}>
        <Logo inverse />
        <p className={styles.promise}>
          Real ingredients, cooked to order, and delivered while it is still hot.
          No mystery shortcuts.
        </p>
      </div>

      <div className={styles.columns}>
        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Shop</h2>
          {shopLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Company</h2>
          {companyLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Support</h2>
          {supportLinks.map((link) => (
            <Link key={link.to} to={link.to}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className={styles.column}>
          <h2 className={styles.columnTitle}>Contact</h2>
          <a href="mailto:hello@foodie.example" className={styles.contactRow}>
            <Icon name="mail" size={15} />
            hello@foodie.example
          </a>
          <span className={styles.contactRow}>
            <Icon name="clock" size={15} />
            11:00 AM – 11:00 PM daily
          </span>
          <span className={styles.contactRow}>
            <Icon name="map-pin" size={15} />
            Bengaluru, India
          </span>
        </div>
      </div>
    </div>

    <div className="container">
      <div className={styles.bottom}>
        <p className={styles.legal}>
          © {new Date().getFullYear()} Foodie. Prices include applicable taxes.
          FSSAI licence details are shown at checkout.
        </p>
        <div className={styles.payments} aria-label="Accepted payment methods">
          <span className={styles.payment}>VISA</span>
          <span className={styles.payment}>Mastercard</span>
          <span className={styles.payment}>UPI</span>
          <span className={styles.payment}>Stripe</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
