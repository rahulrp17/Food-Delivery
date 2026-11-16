import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "motion/react";
import Button from "../ui/Button";
import Icon from "../ui/Icon";
import Logo from "./Logo";
import { useAuthStore, selectIsAuthenticated, selectUser } from "../../stores/auth.store";
import { useCartUiStore, selectItemCount } from "../../stores/cartUi.store";
import { useAuth } from "../../hooks/useAuth";
import styles from "./Navbar.module.css";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/menu", label: "Menu" },
  { to: "/services", label: "Services" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

const announcementItems = [
  { icon: "clock", text: "Delivery 11:00 AM – 11:00 PM", tone: "status" },
  { icon: "sparkles", text: "Free delivery on orders over ₹499", tone: "offer" },
  { icon: "shield-check", text: "Freshly cooked · Secure checkout", tone: "promise" },
];

const announcementSequence = [
  ...announcementItems,
  ...announcementItems,
  ...announcementItems,
];

const focusableSelector =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const reduceMotion = useReducedMotion();
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  const triggerRef = useRef(null);
  const userMenuRef = useRef(null);
  const userButtonRef = useRef(null);
  const location = useLocation();
  const { logout } = useAuth();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const user = useAuthStore(selectUser);
  const itemCount = useCartUiStore(selectItemCount);

  const closeDrawer = useCallback(() => setOpen(false), []);

  const handleLogout = useCallback(async () => {
    setUserOpen(false);
    closeDrawer();
    await logout();
  }, [closeDrawer, logout]);

  useEffect(() => {
    closeDrawer();
    setUserOpen(false);
  }, [location.pathname, closeDrawer]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const trigger = triggerRef.current;
    document.body.style.overflow = "hidden";

    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDrawer();
        return;
      }

      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusable = Array.from(
        drawerRef.current.querySelectorAll(focusableSelector)
      ).filter((element) => element.offsetParent !== null);

      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus?.();
    };
  }, [open, closeDrawer]);

  useEffect(() => {
    if (!userOpen) return undefined;

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) setUserOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      setUserOpen(false);
      userButtonRef.current?.focus();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userOpen]);

  return (
    <>
      <div className={styles.announcement}>
        <p className="sr-only">
          Delivery from 11:00 AM to 11:00 PM. Free delivery on orders over ₹499.
          Freshly cooked and secure checkout.
        </p>
        <div className={styles.marquee} aria-hidden="true">
          <div className={styles.track}>
            {[0, 1].map((group) => (
              <div className={styles.group} key={group}>
                {announcementSequence.map((item, index) => (
                  <span
                    key={`${group}-${index}`}
                    className={`${styles.announcementItem} ${styles[item.tone]}`.trim()}
                  >
                    <Icon name={item.icon} size={14} />
                    {item.text}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`.trim()}>
        <div className={`container ${styles.inner}`}>
          <div className={styles.brand}>
            <Logo />
          </div>

          <nav className={styles.nav} aria-label="Main navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={ ({ isActive }) =>
                  `${styles.link} ${isActive ? styles.linkActive : ""}`.trim()
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className={styles.actions}>
            <NavLink
              to="/search"
              className={styles.searchButton}
              aria-label="Search the menu"
            >
              <Icon name="search" size={20} />
            </NavLink>

            <NavLink
              to="/cart"
              className={`${styles.cartButton} ${itemCount > 0 ? styles.cartHasItems : ""}`.trim()}
              aria-label={
                itemCount > 0
                  ? `Cart, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
                  : "Cart is empty"
              }
            >
              <span className={styles.cartIcon}>
                <Icon name="shopping-bag" size={20} />
                {itemCount > 0 && (
                  <span className={styles.cartBadge} aria-hidden="true">
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </span>
              <span className={styles.cartLabel}>Cart</span>
            </NavLink>

            <span className={styles.divider} aria-hidden="true" />

            {isAuthenticated ? (
              <div className={styles.userMenu} ref={userMenuRef}>
                <button
                  ref={userButtonRef}
                  type="button"
                  className={`${styles.userButton} ${userOpen ? styles.userButtonOpen : ""}`.trim()}
                  aria-expanded={userOpen}
                  aria-haspopup="true"
                  aria-controls="user-menu"
                  aria-label={`User menu, ${user?.name || "Account"}`}
                  onClick={() => setUserOpen((value) => !value)}
                >
                  <span className={styles.userAvatar} aria-hidden="true">
                    {(user?.name || "A").charAt(0).toUpperCase()}
                  </span>
                  <Icon name="chevron-down" size={16} className={styles.chevron} />
                </button>
                <div
                  id="user-menu"
                  className={`${styles.userDropdown} ${userOpen ? styles.userDropdownOpen : ""}`.trim()}
                  role="menu"
                  aria-hidden={!userOpen}
                >
                  <div className={styles.dropdownHeader}>
                    <span className={styles.dropdownName}>{user?.name || "Account"}</span>
                    {user?.email && <span className={styles.dropdownEmail}>{user.email}</span>}
                  </div>
                  <NavLink
                    to="/account"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setUserOpen(false)}
                  >
                    <Icon name="user" size={16} />
                    My Account
                  </NavLink>
                  <NavLink
                    to="/orders"
                    className={styles.dropdownItem}
                    role="menuitem"
                    onClick={() => setUserOpen(false)}
                  >
                    <Icon name="package" size={16} />
                    My Orders
                  </NavLink>
                  <button
                    type="button"
                    className={`${styles.dropdownItem} ${styles.dropdownDanger}`.trim()}
                    role="menuitem"
                    onClick={handleLogout}
                  >
                    <Icon name="log-out" size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <NavLink to="/login" className={styles.authButton} aria-label="Sign in">
                <Icon name="log-in" size={17} />
                <span>Sign in</span>
              </NavLink>
            )}

            <NavLink to="/menu" className={styles.orderButton}>
              Order now
              <Icon name="arrow-right" size={16} />
            </NavLink>

            <button
              ref={triggerRef}
              type="button"
              className={styles.menuButton}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Open menu"
              onClick={() => setOpen(true)}
            >
              <Icon name="menu" size={22} />
            </button>
          </div>
        </div>
      </header>

      <motion.div
        className={`${styles.overlay} ${open ? styles.overlayOpen : ""}`.trim()}
        onClick={closeDrawer}
        aria-hidden="true"
        initial={false}
        animate={{ opacity: open ? 1 : 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }}
      />

      <motion.aside
        id="mobile-menu"
        ref={drawerRef}
        className={`${styles.drawer} ${open ? styles.drawerOpen : ""}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        initial={false}
        animate={{ x: open ? 0 : "100%" }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.drawerTop}>
          <Logo onClick={closeDrawer} />
          <button
            ref={closeRef}
            type="button"
            className={styles.closeButton}
            onClick={closeDrawer}
            aria-label="Close menu"
          >
            <Icon name="x" size={22} />
          </button>
        </div>

        <div className={styles.drawerNavWrap}>
          <span className={styles.drawerEyebrow}>Explore the kitchen</span>
          <nav className={styles.drawerNav} aria-label="Mobile navigation">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `${styles.drawerLink} ${isActive ? styles.drawerLinkActive : ""}`.trim()
                }
                onClick={closeDrawer}
              >
                {link.label}
                <Icon name="chevron-right" size={18} />
              </NavLink>
            ))}
          </nav>
        </div>

        <div className={styles.drawerFooter}>
          <Button to="/menu" fullWidth iconRight={<Icon name="arrow-right" size={18} />}>
            Order now
          </Button>
          <div className={styles.drawerMeta}>
            <span className={styles.drawerMetaRow}>
              <Icon name="clock" size={16} />
              Delivering 11:00 AM - 11:00 PM
            </span>
            <span className={styles.drawerMetaRow}>
              <Icon name="shield-check" size={16} />
              Secure payments by Stripe
            </span>
          </div>

          {isAuthenticated ? (
            <div className={styles.drawerUser}>
              <span className={styles.drawerUserName}>{user?.name}</span>
              <NavLink to="/account" className={styles.drawerAuthLink} onClick={closeDrawer}>
                <Icon name="user" size={18} />
                My Account
              </NavLink>
              <NavLink to="/orders" className={styles.drawerAuthLink} onClick={closeDrawer}>
                <Icon name="package" size={18} />
                My Orders
              </NavLink>
              <button
                type="button"
                className={styles.drawerAuthLink}
                onClick={handleLogout}
              >
                <Icon name="log-out" size={18} />
                Sign Out
              </button>
            </div>
          ) : (
            <NavLink to="/login" className={styles.drawerAuthButton} onClick={closeDrawer}>
              <Icon name="log-in" size={18} />
              Sign In
            </NavLink>
          )}
        </div>
      </motion.aside>
    </>
  );
};

export default Navbar;
