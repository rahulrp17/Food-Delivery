import { Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import CartBar from "./CartBar";
import Footer from "./Footer";
import Navbar from "./Navbar";
import SkipLink from "./SkipLink";
import RouteFallback from "../ui/RouteFallback";

const SiteLayout = () => {
  const location = useLocation();
  const isAuthPage = ["/login", "/register"].includes(location.pathname);
  // The account area is a self-contained workspace with its own navigation,
  // so the marketing header is hidden there.
  const isAccountPage = location.pathname.startsWith("/account");

  return (
    <>
      <SkipLink />
      {!isAuthPage && !isAccountPage ? <Navbar /> : null}
      <main id="main" tabIndex={-1} key={location.pathname} className="page-fade">
        <Suspense fallback={<RouteFallback />}>
          <Outlet />
        </Suspense>
      </main>
      {!isAuthPage ? <Footer /> : null}
      {/* The basket bar is redundant on the cart and checkout pages, which
          already show the basket in full. */}
      <CartBar hiddenPaths={["/cart", "/checkout"]} />
    </>
  );
};

export default SiteLayout;
