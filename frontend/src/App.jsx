import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { ProtectedRoute, GuestRoute } from "./components/layout/ProtectedRoute";
import { AdminRoute, AdminLoginGuard, PermissionRoute } from "./components/layout/AdminRoute";
import SiteLayout from "./components/layout/SiteLayout";
import AdminLayout from "./components/layout/AdminLayout";
import RouteFallback from "./components/ui/RouteFallback";
import ScrollToTop from "./ScrollToTop";
import HomePage from "./pages/HomePage";

const MenuPage = lazy(() => import("./pages/MenuPage"));
const ProductPage = lazy(() => import("./pages/ProductPage"));
const SearchPage = lazy(() => import("./pages/SearchPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const VerifyPage = lazy(() => import("./pages/VerifyPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"));
const LoginPage = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/auth/ResetPasswordPage"));
const AccountPage = lazy(() => import("./pages/account/AccountPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));

const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const OverviewPage = lazy(() => import("./pages/admin/OverviewPage"));
const ProductsPage = lazy(() => import("./pages/admin/ProductsPage"));
const ProductFormPage = lazy(() => import("./pages/admin/ProductFormPage"));
const CategoriesPage = lazy(() => import("./pages/admin/CategoriesPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/OrdersPage"));
const AdminOrderDetailPage = lazy(() => import("./pages/admin/OrderDetailPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./pages/admin/CustomerDetailPage"));
const CouponsPage = lazy(() => import("./pages/admin/CouponsPage"));
const ReviewsPage = lazy(() => import("./pages/admin/ReviewsPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const AuditLogsPage = lazy(() => import("./pages/admin/AuditLogsPage"));
const InventoryPage = lazy(() => import("./pages/admin/InventoryPage"));
const StaffPage = lazy(() => import("./pages/admin/StaffPage"));

function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="product/:slug" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route
            path="checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="verify"
            element={
              <ProtectedRoute>
                <VerifyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="login"
            element={
              <GuestRoute>
                <LoginPage />
              </GuestRoute>
            }
          />
          <Route
            path="register"
            element={
              <GuestRoute>
                <RegisterPage />
              </GuestRoute>
            }
          />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route
          path="/admin/login"
          element={
            <AdminLoginGuard>
              <Suspense fallback={<RouteFallback />}>
                <AdminLoginPage />
              </Suspense>
            </AdminLoginGuard>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<PermissionRoute permission="overview:read"><OverviewPage /></PermissionRoute>} />
          <Route path="products" element={<PermissionRoute permission="catalog:read"><ProductsPage /></PermissionRoute>} />
          <Route path="products/new" element={<PermissionRoute permission="catalog:write"><ProductFormPage /></PermissionRoute>} />
          <Route path="products/:id" element={<PermissionRoute permission="catalog:write"><ProductFormPage /></PermissionRoute>} />
          <Route path="categories" element={<PermissionRoute permission="catalog:read"><CategoriesPage /></PermissionRoute>} />
          <Route path="orders" element={<PermissionRoute permission="orders:read"><AdminOrdersPage /></PermissionRoute>} />
          <Route path="orders/:id" element={<PermissionRoute permission="orders:read"><AdminOrderDetailPage /></PermissionRoute>} />
          <Route path="customers" element={<PermissionRoute permission="customers:read"><CustomersPage /></PermissionRoute>} />
          <Route path="customers/:id" element={<PermissionRoute permission="customers:read"><CustomerDetailPage /></PermissionRoute>} />
          <Route path="coupons" element={<PermissionRoute permission="coupons:read"><CouponsPage /></PermissionRoute>} />
          <Route path="reviews" element={<PermissionRoute permission="reviews:read"><ReviewsPage /></PermissionRoute>} />
          <Route path="inventory" element={<PermissionRoute permission="inventory:read"><InventoryPage /></PermissionRoute>} />
          <Route path="staff" element={<PermissionRoute permission="staff:read"><StaffPage /></PermissionRoute>} />
          <Route path="settings" element={<PermissionRoute permission="settings:read"><SettingsPage /></PermissionRoute>} />
          <Route path="audit-logs" element={<PermissionRoute permission="audit:read"><AuditLogsPage /></PermissionRoute>} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
