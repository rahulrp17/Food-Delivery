import React from "react";
import { useContext } from "react";
import { useState } from "react";
import { StoreContext } from "../../context/StoreContext";
import axios from "axios";
import { useEffect } from "react";
import { assets } from "../../assets/assets";
import "./MyOrders.css";

const MyOrders = () => {
  const [data, setData] = useState([]);
  const { url, token } = useContext(StoreContext);

  const fetchOrders = async () => {
    const response = await axios.post(
      url + "/api/orders/userOrders",
      {},
      { headers: { token: token } }
    );
    setData(response.data.data);
    console.log(response.data.data);
  };

  useEffect(() => {
    if (token) {
      fetchOrders();
    }
  }, [token]);

  return (
    <div className="my-orders">
      <h2>My Orders</h2>
      <div className="container">
        {data.map((order, index) => {
          return (
            <div className="order-container" key={index}>
              <img src={assets.parcel_icon} alt="" />
             <p>{order.items.map((item,index)=>{
              if(index===order.items.length-1){
                return item.name+" x "+item.quantity
              }
              else{
                return item.name+" x "+item.quantity+", "
              }
             })}</p>
             <p>${order.amount}</p>
             <p>items: {order.items.length}</p>
             <p><span>&#x25cf;</span><b>{order.status}</b></p>
             <button onClick={()=>fetchOrders()}>Track Order</button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default MyOrders;
