import React, { useContext } from "react";
import "./Placeorder.css";
import { StoreContext } from "../../context/StoreContext";
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";


// import { useEffect } from "react";

const PlaceOrder = () => {
  const { getTotalCartAmount, token, food_list, cartItems, url } =
    useContext(StoreContext);
  const [data, setData] = useState({
    firstName: "",
    lastName: "",
    city: "",
    email: "",
    state: "",
    zipCode: "",
    country: "",
    phone: "",
    address: "",
    street: "",
  });

  const handleChange = (e) => {
   
    const name = e.target.name;
    const value = e.target.value;
    setData(data => ({ ...data, [name]: value }));
  };

  // useEffect(() => {
  //   console.log(data);
  // }, [data]);

  const placeOrder = async (e) => {
    e.preventDefault();
    let orderItems = [];
    food_list.map((item) => {
      if (cartItems[item._id] > 0) {
        let itemInf0 = item;
        itemInf0["quantity"] = cartItems[item._id];
        orderItems.push(itemInf0);
      }
    });
    
    let orderData={
      orderAddress:data,
      items:orderItems,
      amount:getTotalCartAmount()+2,
    }
    console.log(orderData);
    try{
    const response =await axios.post(url+"/api/orders/placeOrder",orderData,{headers:{token}});
    if(response.data.session_url){
      window.location.href=response.data.session_url
    }else{
      alert("Failed to create stripe session")
    }
    }
    catch(error){
      console.log(error);
    }

  };

  const navigate=useNavigate()
  useEffect(()=>{
    if(!token){
      navigate("/login")
    }
    else if(getTotalCartAmount()===0){
      navigate("/")
      alert("Cart is empty. Please add items to cart")
    }
    else{
      navigate("/placeOrder")
    }
  })

  return (
    <form onSubmit={placeOrder} className="place-order">
      <div className="place-order-left">
        <p className="title">Delivery Information</p>
        <div className="multi-fields">
          <input
            type="text"
            onChange={handleChange}
            placeholder="First Name"
            name="firstName"
            value={data.firstName}
            required
          />
          <input
            type="text"
            onChange={handleChange}
            placeholder="Last Name"
            name="lastName"
            value={data.lastName}
            id=""
             required
          />
        </div>
        <div className="multi-fields">
          <input
            type="text"
            onChange={handleChange}
            placeholder="City"
            name="city"
            value={data.city}
             required
          />
          <input
            type="text"
            onChange={handleChange}
            placeholder="State"
            name="state"
            value={data.state}
             required
            id=""
          />
        </div>
        <div className="multi-fields">
          <input
            type="text"
            onChange={handleChange}
             required
            placeholder="Email"
            name="email"
            value={data.email}
          />
          <input
            type="text"
            onChange={handleChange}
            placeholder="Street"
            name="street"
            value={data.street}
             required
            id=""
          />
        </div>
        <div className="multi-fields">
          <input
            type="text"
            onChange={handleChange}
            placeholder="Zip Code"
             required
            name="zipCode"
            value={data.zipCode}
          />
          <input
            type="text"
            onChange={handleChange}
            placeholder="Country"
            name="country"
            value={data.country}
            id=""
             required
          />
        </div>
        <div className="multi-fields">
          <input
            type="text"
            onChange={handleChange}
            placeholder="Phone"
            name="phone"
             required
            value={data.phone}
          />
          <textarea
            onChange={handleChange}
            placeholder="Address"
            name="address"
            value={data.address}
             required
            id=""
          ></textarea>
        </div>
      </div>
      <div className="place-order-right">
        <div className="cart-total">
          <h2>Total</h2>
          <div>
            <div className="cart-total-details">
              <p>Subtotal</p>
              <p>${getTotalCartAmount()}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <p>Delivery Fee</p>
              <p>${2}</p>
            </div>
            <hr />
            <div className="cart-total-details">
              <b>Total</b>
              <b>
                ${getTotalCartAmount() === 0 ? 0 : getTotalCartAmount() + 2}
              </b>
            </div>
          </div>
          <button type="submit">PROCEED TO PAYMENT</button>
        </div>
      </div>
    </form>
  );
};

export default PlaceOrder;
