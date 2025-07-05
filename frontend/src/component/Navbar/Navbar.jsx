import React, { useContext, useState } from "react";
import "./Navbar.css";
import { assets } from "../../assets/assets";
import{Link, useNavigate} from 'react-router-dom'
import { StoreContext } from "../../context/StoreContext";
import { useEffect } from "react";


const Navbar = ({setShowLogin}) => {
  const [menu, setMenu] = useState("home");
  const navigate=useNavigate()
  const {getTotalCartAmount,token,setToken} = useContext(StoreContext);

  const handleLogout=()=>{
    localStorage.removeItem("token");
    setToken("");
    navigate("/");
  }
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setToken(token);
    }
  }, [setToken]);


  return (
    <div className="navbar" >
      <Link to='/'><img onClick={()=>setMenu("home")} src={assets.RP17} alt="" className="logo-icon" /></Link>
      <ul className="navbar-menu">
        <Link to='/' onClick={()=>setMenu("home")} className={menu === "home" ? "active" : ""}>Home</Link>
        <a href="#explore-menu" onClick={()=>setMenu("menu")} className={menu === "menu" ? "active" : ""}>Menu</a>
        <a href="#app-download" onClick={()=>setMenu("mobile-app")} className={menu === "mobile-app" ? "active" : ""}>Mobile-App</a>
        <a href="#footer" onClick={()=>setMenu("contact-us")} className={menu === "contact-us" ? "active" : ""}>Contact us </a>
        </ul>
        <div className="navbar-right">
        <img src={assets.search_icon} alt="" />
        <div className="navbar-search-icon">
          <Link to='/cart' onClick={()=>navigate("cart")} className={menu === "cart" ? "active" : ""}>
          <img src={assets.basket_icon} alt="" />
          </Link>
          <div className={getTotalCartAmount()===0?"":"dot"}></div>
        </div>
       { !token ? (
          <button onClick={()=>setShowLogin(true)}>Sign in</button>
       ) : (
        <div className="navbar-profile">
        <img src={assets.profile_icon} alt="" />
        <ul className="navbar-profile-menu">
          
          <li onClick={()=>navigate("myOrders")} ><img src={assets.bag_icon} alt="" /><p>Orders</p></li>
          <hr />
          <li onClick={()=>handleLogout()}> <img src={assets.logout_icon} alt="" />Logout</li>
        </ul>
       </div>
       )}
      </div>
    </div>
  );
};

export default Navbar;
