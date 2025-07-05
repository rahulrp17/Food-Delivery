// src/App.js
import { Routes, Route } from "react-router-dom";
import "./App.css";
import { useState } from "react";
import ProtectedRoute from "./ProtectedRoutes";

// User components
import Navbar from "./component/Navbar/Navbar";
import Footer from "./component/Footer/Footer";
import Home from "./pages/Home/Home";
import Cart from "./pages/Cart/Cart";
import PlaceOrder from "./pages/PlaceOrder/PlaceOrder";
import Verify from "./pages/verify/Verify";
import MyOrders from "./pages/MyOrders/MyOrders";
import LoginPopUp from "./component/LoginPopUp/LoginPopUp";

// // Admin components
// import AdminNavbar from "./component/navbar/AdminNavbar";
// import Sidebar from "./component/Sidebar/Sidebar";
// import Add from "./pages/add/Add";
// import List from "./pages/List/List";
// import Orders from "./pages/orders/Orders";

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const role = localStorage.getItem("role");

  return (
    <>
      {showLogin && <LoginPopUp setShowLogin={setShowLogin} />}
        <div className="user-app">
          <Navbar setShowLogin={setShowLogin} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/placeOrder" element={<PlaceOrder />} />
            <Route path="/verify" element={<Verify />} />
            <Route path="/myOrders" element={<MyOrders />} />
          </Routes>
          <Footer />
        </div>
    </>
  );
}

export default App;
