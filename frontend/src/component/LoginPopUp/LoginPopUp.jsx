import React, { useState } from "react";
import "./LoginPopUp.css";
import { assets } from "../../assets/assets";
import { useContext } from "react";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";


const LoginPopUp = ({ setShowLogin }) => {
  const [currentState, setCurrentState] = useState("Login");
  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const {url,setToken}=useContext(StoreContext);
 const handleLogin = async (e) => {
  e.preventDefault();
  let newUrl = url;

  if (currentState === "Login") {
    newUrl += "/api/user/login";
  } else {
    newUrl += "/api/user/register";
  }

  try {
    const response = await axios.post(newUrl, data);
    console.log(response);

    if (response.data.success) {
      setShowLogin(false);
      setToken(response.data.token);
      localStorage.setItem("token", response.data.token);

  
      localStorage.setItem("role", response.data.user?.role || "user");

      
      window.location.reload();
    }
  } catch (err) {
    console.error("Login/Register failed:", err.response?.data?.message || err.message);
    alert("Something went wrong: " + (err.response?.data?.message || "Unknown error"));
  }
};

 
 
  const handleChange = (e) => {
    const name=e.target.name;
    const value=e.target.value;
    setData((data)=>({...data,[name]:value}))
  }

  return (
    <div className="login-popup posit">
      <form className="login-popup-container" onSubmit={handleLogin}>
        <div className="login-popup-title">
          <h2>{currentState}</h2>
          <img
            onClick={() => setShowLogin(false)}
            src={assets.cross_icon}
            alt=""
          />
           </div>
          <div className="login-popup-inputs">
            {currentState === "Login" ? (
              <></>
            ) : (
              <input type="text" placeholder="Your Name" name="name" value={data.name} onChange={handleChange} required />
            )}

            <input type="email" placeholder="Your Email" name="email" value={data.email} onChange={handleChange} required />
            <input type="password" placeholder="Password" name="password" value={data.password} onChange={handleChange} required />
          </div>
          <button type="submit">
            {currentState === "Sign Up" ? "Create account" : "Login"}
          </button>
          <div className="login-popup-condition">
            <input type="checkbox" required id="" />
            <p>By continuing, i agree to terms of use & privacy policy</p>
          </div>
          {currentState==="Login"
          ?<p>
            Create a new account? <span onClick={()=>setCurrentState("Sign Up")}>Click here</span>
          </p>
          : <p>Already have an account? <span onClick={()=>setCurrentState("Login")}>Login</span></p>      }
       
      </form>
    </div>
  );
};

export default LoginPopUp;
