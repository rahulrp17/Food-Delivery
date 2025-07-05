import React from "react";
import "./Footer.css";
import { assets } from "../../assets/assets";

const Footer = () => {
  return (
    <div className="footer" id="footer">
      <div className="footer-content">
        <div className="footer-content-left">
          <img src={assets.logo} alt="" />
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Ipsa
            ducimus reprehenderit incidunt natus voluptatibus nostrum iusto
            tempore, quibusdam cum, amet vel rerum! Quam quia, verit
          </p>
           <div className="footer-social-icons">
          <img src={assets.facebook_icon} alt="" />
          <img src={assets.twitter_icon} alt="" />
          <img src={assets.linkedin_icon} alt="" />
        </div>
        </div>
        <div className="footer-content-center">
            <h2>Company</h2>
            <ul>
            <li>Home</li>
            <li>About Us</li>
            <li>Delivery</li>
            <li>Private Policy</li>
            </ul>
        </div>
        <div className="footer-content-right">
             <h2>GET IN TOUCH</h2>  
             <ul>
                <li>+1 234 567 890</li>
                <li>example@gmail.com</li>
                <li>Address</li>
                <li>City, State, Zip</li>
             </ul>

        </div>
      </div>
      <p className="footer-Copyright">
        Copyright 2025 © All Rights Reserved.
      </p>
      <hr />
    </div>
  );
};

export default Footer;
