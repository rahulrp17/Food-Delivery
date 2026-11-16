import { Outlet, useLocation, useNavigate, NavLink, Link } from 'react-router-dom';
import { Suspense, useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { adminApi } from '../../api/admin.api';
import { queryKeys } from '../../api/queryKeys';
import Icon from '../ui/Icon';
import RouteFallback from '../ui/RouteFallback';
import Breadcrumbs from '../ui/Breadcrumbs';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import '../../styles/admin-buttons.css';
import './AdminLayout.css';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin', label: 'Dashboard', icon: 'layout', end: true, permission: 'overview:read' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/admin/orders', label: 'Orders', icon: 'truck', permission: 'orders:read' },
      { to: '/admin/inventory', label: 'Inventory', icon: 'bar-chart', permission: 'inventory:read' },
    ],
  },
  {
    label: 'Catalog',
    items: [
      { to: '/admin/products', label: 'Products', icon: 'package', permission: 'catalog:read' },
      { to: '/admin/categories', label: 'Categories', icon: 'tag', permission: 'catalog:read' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { to: '/admin/customers', label: 'Customers', icon: 'user', permission: 'customers:read' },
      { to: '/admin/reviews', label: 'Reviews', icon: 'star', permission: 'reviews:read' },
    ],
  },
  {
    label: 'Growth',
    items: [{ to: '/admin/coupons', label: 'Coupons', icon: 'ticket', permission: 'coupons:read' }],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/staff', label: 'Staff', icon: 'shield-check', permission: 'staff:read' },
      { to: '/admin/audit-logs', label: 'Activity', icon: 'clock', permission: 'audit:read' },
      { to: '/admin/settings', label: 'Settings', icon: 'settings', permission: 'settings:read' },
    ],
  },
];

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/products': 'Products',
  '/admin/products/new': 'New product',
  '/admin/products/': 'Edit product',
  '/admin/categories': 'Categories',
  '/admin/orders': 'Orders',
  '/admin/orders/': 'Order detail',
  '/admin/inventory': 'Inventory',
  '/admin/customers': 'Customers',
  '/admin/customers/': 'Customer detail',
  '/admin/coupons': 'Coupons',
  '/admin/reviews': 'Reviews',
  '/admin/staff': 'Staff',
  '/admin/audit-logs': 'Activity',
  '/admin/settings': 'Settings',
};

const SIDEBAR_STORAGE_KEY = 'foodie-admin-sidebar-collapsed';

const QUICK_ACTIONS = [
  { to: '/admin/products/new', label: 'New product', icon: 'plus', permission: 'catalog:write' },
  { to: '/admin/orders', label: 'Open order board', icon: 'truck', permission: 'orders:read' },
  { to: '/admin/categories', label: 'Manage categories', icon: 'tag', permission: 'catalog:read' },
  { to: '/admin/coupons', label: 'Create a promotion', icon: 'ticket', permission: 'coupons:read' },
  { to: '/admin/customers', label: 'Customer directory', icon: 'user', permission: 'customers:read' },
  { to: '/admin/settings', label: 'Store settings', icon: 'settings', permission: 'settings:read' },
];

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

function timeAgo(value) {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return '';
  const minutes = Math.floor(Math.max(0, Date.now() - time) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [topbarScrolled, setTopbarScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const searchRef = useRef(null);
  const profileRef = useRef(null);
  const notificationsRef = useRef(null);
  const quickActionsRef = useRef(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const queryClient = useQueryClient();
  const reduceMotion = useReducedMotion();

  const canAccess = (permission) => {
    if (!permission) return true;
    if (!user) return false;
    if (!Array.isArray(user.permissions)) return user.role === 'admin';
    return user.permissions.includes(permission);
  };

  const notificationsAllowed = canAccess('notifications:read');

  const { data: notificationData } = useQuery({
    queryKey: queryKeys.admin.notifications({ limit: 8 }),
    queryFn: () => adminApi.notifications({ limit: 8 }),
    refetchInterval: () =>
      typeof document !== 'undefined' && document.visibilityState === 'hidden' ? false : 30000,
    staleTime: 15000,
    enabled: notificationsAllowed,
  });

  const invalidateNotifications = () =>
    queryClient.invalidateQueries({ queryKey: ['admin', 'notifications'] });

  const markReadMutation = useMutation({
    mutationFn: adminApi.markNotificationRead,
    onSuccess: invalidateNotifications,
  });
  const markAllMutation = useMutation({
    mutationFn: adminApi.markAllNotificationsRead,
    onSuccess: invalidateNotifications,
  });

  const notifications = notificationData?.items || [];
  const unreadCount = notificationData?.summary?.unreadCount || 0;

  const visibleNavGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => canAccess(item.permission)),
  })).filter((group) => group.items.length > 0);

  const visibleQuickActions = QUICK_ACTIONS.filter((action) => canAccess(action.permission));

  const openNotification = (notification) => {
    if (!notification.readAt) markReadMutation.mutate(notification.id);
    setNotificationsOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    for (const [route, title] of Object.entries(PAGE_TITLES)) {
      if (route.endsWith('/') && path.startsWith(route) && path.length > route.length) {
        return title;
      }
      if (path === route) return title;
    }
    return 'Admin';
  };

  /**
   * Builds the breadcrumb trail from the current path: Admin › <section> › <page>.
   */
  const getBreadcrumbs = () => {
    const path = location.pathname;
    const title = getPageTitle();
    const items = [{ label: 'Admin', to: '/admin' }];

    let matched = null;
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        if (path === item.to || path.startsWith(`${item.to}/`)) {
          if (!matched || item.to.length > matched.to.length) matched = item;
        }
      }
    }

    if (matched && matched.to !== '/admin') {
      items.push({ label: matched.label, to: matched.to });
    }

    const last = items[items.length - 1];
    if (last.label !== title) {
      items.push({ label: title });
    } else {
      items[items.length - 1] = { label: title };
    }

    return items;
  };

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Storage can be unavailable in private contexts.
      }
      return next;
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (query) navigate(`/admin/orders?q=${encodeURIComponent(query)}`);
  };

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout();
    navigate('/admin/login', { replace: true });
  };

  useEffect(() => {
    setSidebarOpen(false);
    setProfileOpen(false);
    setNotificationsOpen(false);
    setQuickActionsOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setTopbarScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const closeOnOutside = (event) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [notificationsOpen]);

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''} ${topbarScrolled ? 'scrolled' : ''}`}>
      <a href="#admin-main" className="skip-link">
        Skip to main content
      </a>

      <aside
        id="admin-sidebar"
        className={`admin-sidebar ${sidebarOpen ? 'is-open' : ''}`}
        role="navigation"
        aria-label="Admin navigation"
      >
        <div className="sidebar-header">
          <Link to="/admin" className="sidebar-brand" aria-label="Foodie Admin Pro">
            <span className="sidebar-brand-mark" aria-hidden="true">
              <Icon name="chef-hat" size={24} label="" />
            </span>
            <span className="sidebar-brand-text">
              <strong>Foodie</strong>
              <small>Admin Pro</small>
            </span>
          </Link>
          <button
            type="button"
            className="sidebar-collapse"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
          >
            <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={16} label="" />
          </button>
        </div>

        <nav className="sidebar-nav">
          {visibleNavGroups.map((group) => (
            <div className="sidebar-group" key={group.label}>
              <p className="sidebar-group-label">{group.label}</p>
              <ul role="list">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      data-tooltip={item.label}
                      className={({ isActive }) =>
                        `sidebar-link ${isActive ? 'is-active' : ''}`
                      }
                    >
                      <Icon name={item.icon} size={19} label="" aria-hidden="true" />
                      <span className="sidebar-link-label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <Link
            to="/"
            className="sidebar-footer-link"
            target="_blank"
            rel="noopener"
            data-tooltip="View store"
          >
            <Icon name="arrow-up-right" size={18} label="" aria-hidden="true" />
            <span className="sidebar-link-label">View store</span>
          </Link>
        </div>
      </aside>

      <div
        className="sidebar-overlay"
        style={{
          opacity: sidebarOpen ? 1 : 0,
          visibility: sidebarOpen ? 'visible' : 'hidden',
          transition: 'opacity 0.25s var(--ease-standard)',
        }}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            type="button"
            className="hamburger"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={sidebarOpen}
            aria-controls="admin-sidebar"
          >
            <Icon name={sidebarOpen ? 'x' : 'hamburger'} size={22} label="" aria-hidden="true" />
          </button>

          <div className="topbar-heading">
            <Breadcrumbs items={getBreadcrumbs()} className="topbar-crumbs" />
            <p className="topbar-title">{getPageTitle()}</p>
          </div>

          <div className="topbar-search" role="search">
            <form onSubmit={handleSearch}>
              <label htmlFor="topbar-search" className="visually-hidden">
                Search orders
              </label>
              <input
                ref={searchRef}
                id="topbar-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders..."
                aria-label="Search orders"
              />
              <button type="submit" aria-label="Search orders">
                <Icon name="search" size={18} label="" aria-hidden="true" />
              </button>
            </form>
          </div>

          <div className="topbar-actions">
            <div className="topbar-quick-actions" ref={quickActionsRef}>
              <button
                type="button"
                className="topbar-quick-trigger"
                onClick={() => setQuickActionsOpen((open) => !open)}
                aria-label="Quick actions"
                aria-expanded={quickActionsOpen}
                aria-haspopup="menu"
              >
                <Icon name="sparkles" size={17} label="" aria-hidden="true" />
                <span className="topbar-quick-label">Quick actions</span>
              </button>

              <AnimatePresence>
                {quickActionsOpen ? (
                  <motion.div
                    className="quick-actions-menu"
                    role="menu"
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.98 }}
                    transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {visibleQuickActions.map((action) => (
                      <Link
                        key={action.to}
                        to={action.to}
                        className="quick-actions-item"
                        role="menuitem"
                        onClick={() => setQuickActionsOpen(false)}
                      >
                        <span className="quick-actions-icon">
                          <Icon name={action.icon} size={16} label="" aria-hidden="true" />
                        </span>
                        <span>{action.label}</span>
                      </Link>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <Link
              to="/"
              target="_blank"
              rel="noopener"
              className="topbar-icon-button"
              aria-label="View customer store"
              title="View customer store"
            >
              <Icon name="arrow-up-right" size={19} label="" aria-hidden="true" />
            </Link>

            {notificationsAllowed && (
              <div className="topbar-notifications" ref={notificationsRef}>
                <button
                  type="button"
                  className="topbar-icon-button notif-trigger"
                  onClick={() => setNotificationsOpen((open) => !open)}
                  aria-label={
                    unreadCount > 0 ? `Notifications (${unreadCount} unread)` : 'Notifications'
                  }
                  aria-expanded={notificationsOpen}
                  aria-haspopup="menu"
                >
                  <Icon name="bell" size={19} label="" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="notif-badge" aria-hidden="true">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div className="notif-panel" role="menu">
                    <div className="notif-panel-head">
                      <strong>Notifications</strong>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={() => markAllMutation.mutate()}
                          disabled={markAllMutation.isPending}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <ul className="notif-list" role="list">
                      {notifications.length === 0 && (
                        <li className="notif-empty">You&apos;re all caught up.</li>
                      )}
                      {notifications.map((notification) => (
                        <li key={notification.id}>
                          <button
                            type="button"
                            role="menuitem"
                            className={`notif-item ${notification.readAt ? '' : 'is-unread'}`}
                            onClick={() => openNotification(notification)}
                          >
                            <span
                              className={`notif-dot notif-${notification.severity}`}
                              aria-hidden="true"
                            />
                            <span className="notif-copy">
                              <strong>{notification.title}</strong>
                              {notification.body ? <span>{notification.body}</span> : null}
                              <time>{timeAgo(notification.createdAt)}</time>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/admin/audit-logs"
                      className="notif-footer"
                      onClick={() => setNotificationsOpen(false)}
                    >
                      View activity log
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="topbar-profile" ref={profileRef}>
              <button
                type="button"
                className="profile-trigger"
                onClick={() => setProfileOpen((open) => !open)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
              >
                <span className="profile-avatar" aria-hidden="true">
                  {getInitials(user?.name) || <Icon name="user" size={16} label="" />}
                </span>
                <span className="profile-copy">
                  <strong>{user?.name || 'Admin'}</strong>
                  <small>Administrator</small>
                </span>
                <Icon name="chevron-down" size={15} label="" aria-hidden="true" />
              </button>

              {profileOpen && (
                <div className="profile-menu" role="menu">
                  <div className="profile-menu-head">
                    <span className="profile-avatar profile-avatar--lg" aria-hidden="true">
                      {getInitials(user?.name) || <Icon name="user" size={18} label="" />}
                    </span>
                    <div>
                      <strong>{user?.name || 'Admin'}</strong>
                      {user?.email ? <span>{user.email}</span> : null}
                    </div>
                  </div>
                  <div className="profile-menu-divider" />
                  <Link to="/" target="_blank" rel="noopener" role="menuitem">
                    <Icon name="external-link" size={16} label="" aria-hidden="true" />
                    View store
                  </Link>
                  <button type="button" onClick={handleLogout} role="menuitem">
                    <Icon name="log-out" size={16} label="" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <motion.main
          id="admin-main"
          key={location.pathname}
          className="admin-content"
          tabIndex={-1}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          <Suspense fallback={<RouteFallback />}>
            <Outlet />
          </Suspense>
        </motion.main>
      </div>
    </div>
  );
}
