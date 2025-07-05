import express from "express";
import {loginUser,registerUser} from "../controllers/userController.js"
import authMiddleware from "../middleware/auth.js";
import { adminMiddleware } from "../middleware/auth.js";


const userRouter=express.Router();

userRouter.post("/login",loginUser);
userRouter.post("/register",registerUser);

//protected route for user
userRouter.get("/profile",authMiddleware,(req,res)=>{ 
    res.json({ message: `Welcome ${req.user.role}`, success: true });
});


//protected route for admin
userRouter.get("/admin",adminMiddleware("admin"),(req,res)=>{ 
    res.json({ message: `Welcome ${req.user.role}`, success: true });
});


export default userRouter
