import { Link } from "react-router-dom";
import styles from "./Logo.module.css";

const Logo = ({ inverse = false, onClick }) => (
  <Link
    to="/"
    className={`${styles.logo} ${inverse ? styles.inverse : ""}`.trim()}
    aria-label="Foodie home"
    onClick={onClick}
  >
    <span className={styles.mark} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 8c-.6-2.6.6-4.6 3.6-4.9-.5 2.4-1.4 3.9-3.6 4.9Z"
          fill="currentColor"
          opacity="0.9"
        />
        <path
          d="M6 12.5a6 6 0 0 1 12 0c0 3.6-2.7 6.5-6 6.5s-6-2.9-6-6.5Z"
          fill="currentColor"
          opacity="0.18"
        />
        <path
          d="M6 12.5a6 6 0 0 1 12 0c0 3.6-2.7 6.5-6 6.5s-6-2.9-6-6.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M8.5 14h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </span>
    <span className="font-mono">Foodie</span>
  </Link>
);

export default Logo;
