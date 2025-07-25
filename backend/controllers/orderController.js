import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from "stripe";
import dotenv from "dotenv";


const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);
//Placing user order from frontend


dotenv.config();
const placeOrder=async(req,res)=>{
  const frontend_url="https://food-delivery-frontend-ib75.onrender.com/";

    try {
        const newOrder = new orderModel({
            userId: req.body.userId,
            items: req.body.items,
            amount: req.body.amount,
            address: req.body.orderAddress
        })
        await newOrder.save();
          await userModel.findByIdAndUpdate(req.body.userId,{cartData:{}});
        //   res.json({message:"Order Placed Successfully",success:true,data:newOrder});
 
          const line_items=req.body.items.map((item)=>({price_data:{currency:"inr",product_data:{name:item.name},unit_amount:item.price*100*80},quantity:item.quantity}));
          line_items.push({price_data:{currency:"inr",product_data:{name:"Delivery Charge"},unit_amount:2*100*80},quantity:1});
          const session=await stripe.checkout.sessions.create({payment_method_types:["card"],
            line_items:line_items,
            mode:"payment",
            success_url:`${frontend_url}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url:`${frontend_url}/verify?success=false&orderId=${newOrder._id}`});
          console.log("Stripe session created successfully",session.url);
          
          return res.send({session_url:session.url,success:true});
    } catch (error) {
        console.log(error);
        if(!res.headersSent){return res.status(400).json({message:error.message,success:false})}
    }
}
const verifyOrder=async(req,res)=>{
   const {orderId,success}=req.body;
   try{
    if(success==="true"){
        await orderModel.findByIdAndUpdate(orderId,{payment:true});
        return res.status(200).json({message:"Paid",success:true});
    }
    else{
        await orderModel.findByIdAndDelete(orderId,{status:"Failed"});
        return res.status(200).json({message:"Order Failed",success:false});
    }
   }catch(error){
    console.log(error);
    res.status(400).json({message:error.message,success:false});
   }
}

const userOrders=async(req,res)=>{
    try {
        const orders=await orderModel.find({userId:req.body.userId});
        res.json({message:"Orders fetched successfully",success:true,data:orders});
    } catch (error) {
        console.log(error);
        res.status(400).json({message:error.message,success:false});
    }
}

const listOrders=async(req,res)=>{
    try {
        const orders=await orderModel.find({});
        res.json({message:"Orders fetched successfully",success:true,data:orders});
    } catch (error) {
        console.log(error);
        res.status(400).json({message:error.message,success:false});
    }
}

const updateStatus=async(req,res)=>{
    try {
        await orderModel.findByIdAndUpdate(req.body.orderId,{status:req.body.status});
        res.json({message:"Status updated successfully",success:true});
    } catch (error) {
        console.log(error);
        res.status(400).json({message:error.message,success:false});
    }
}

export {placeOrder,verifyOrder,userOrders,listOrders,updateStatus};
