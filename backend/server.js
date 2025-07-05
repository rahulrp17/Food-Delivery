import express from "express"
import cors from "cors"
import connectDB from "./config/db.js"
import "dotenv/config"
import foodRouter from "./routes/foodRoutes.js"
import userRouter from "./routes/userRoute.js"
import cartRouter from "./routes/cartRoutes.js"
import orderRouter from "./routes/orderRoutes.js"
import dotenv from "dotenv"



dotenv.config();
// app config
const app=express()
const port=process.env.PORT || 4000

// middleware
app.use(express.json())
app.use(cors())

// db connection
connectDB();


//api endPoints
app.use("/api/food",foodRouter)
app.use("/images",express.static("uploads"))
app.use("/api/user",userRouter)
app.use("/api/cart",cartRouter)
app.use("/api/orders",orderRouter)


app.get("/",(req,res)=>{
    res.send("api working")
})

app.listen(port,()=>{
    console.log(`Server Started on http://localhost:${port}`);
})

// mongodb+srv://rahul:rahul2004@cluster0.hdilbbh.mongodb.net/?