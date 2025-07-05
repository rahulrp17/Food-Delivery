import React from "react";
import "./Orders.css";
import { useState } from "react";
import axios from "axios";
import { useEffect } from "react";
import { toast } from "react-toastify";
import { assets } from "../../assets/assets";

const Orders = ({ url }) => {
  const [orders, setOrders] = useState([]);

  const fetchAllOrders = async () => {
    const response = await axios.get(url + "/api/orders/listOrders");
    if (response.data.success) {
      setOrders(response.data.data);
    } else {
      console.log(response.data.message);
      toast.error(response.data.message);
    }
  };

const statusHandler=async(orderId,event)=>{
  try{
   const response= await axios.post(url+"/api/orders/status",{orderId,status:event.target.value});
    if(response.data.success){
      await fetchAllOrders();
      toast.success(response.data.message);
    }
  }catch(error){
    console.log(error);
    toast.error(error.message);
  }
}

  useEffect(() => {
    fetchAllOrders();
  }, []);

  return (
    <div className="order add">
      <h3>Order Page</h3>
      <div className="order-list">
        {orders.map((order, index) => {
          return (
            <div className="order-item" key={index}>
              <img src={assets.parcel_icon} alt="" />
              <div>
                <p className="order-item-food">
                {order.items.map((item, index) => {
                  if (index === order.items.length - 1) {
                    return item.name + " x " + item.quantity;
                  } else {
                    return item.name + " x " + item.quantity + ", ";
                  }
                })}
              </p>
              <p className="order-item-name">
                {order.address.firstName + " " + order.address.lastName}
              </p>
              <div className="order-item-address">
                <p>{order.address.street + ", " }</p>
                <p>{order.address.city+", " + order.address.state+", " + order.address.country+", " + order.address.zipCode}</p>
              </div>
               <p >{order.address.phone}</p>
              </div>
              <p>Items: {order.items.length} </p>
              <p>Price:${order.amount}</p>
              <select onChange={(e)=>statusHandler(order._id,e)} value={order.status}>
                <option className="opt" value="Food Processing">Food Processing</option>
                <option className="opt" value="Out for Delivery">Out for Delivery</option>
                <option className="opt" value="Delivered">Delivered</option>
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Orders;
