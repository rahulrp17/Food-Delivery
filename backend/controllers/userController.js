import userModel from "../models/userModel.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";


const loginUser=async(req,res)=>{
    try {
        const {email,password}=req.body
        if(!validator.isEmail(email)){
            return res.status(400).json({message:"Invalid Email",success:false});
        }
        const user=await userModel.findOne({email:email});
        if(!user){
            return res.status(400).json({message:"User Not Found",success:false});
        }
        const isMatch=await bcrypt.compare(password,user.password);
        if(!isMatch){
            return res.status(400).json({message:"Invalid Password",success:false});
        }
        const token=createToken(user._id,user.role);
        // res.cookie({"token":token,success:true});
        res.status(200).json({message:"Login Successful",success:true,user,token});
     
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal Server Error",success:false,});
    }
}

const createToken=(_id,role)=>{
  
        return jwt.sign({id:_id,role},process.env.JWT_SECRET,{
            expiresIn:"7d"
        })
}

const registerUser=async(req,res)=>{
    try {
        const {name,email,password, role="user"}=req.body;
        if(!validator.isEmail(email)){
            return res.status(400).json({message:"Invalid Email",success:false});
        }
        const existingUser=await userModel.findOne({email:email});
        if(existingUser){
            return res.status(400).json({message:"User Already Exists",success:false});
        }
        if(password.length<8){
            return res.status(400).json({message:"Password must be at least 8 characters",success:false});
        }
        const salt=await bcrypt.genSalt(10);
        const hashedPassword=await bcrypt.hash(password,salt);
        const newUser=new userModel({name:name,email:email,password:hashedPassword,role:role});
        const savedUser =await newUser.save();
        const token=createToken(savedUser._id,savedUser.role);
        res.status(200).json({message:"User Registered Successfully",success:true,token});
    } catch (error) {
        console.log(error);
        res.status(500).json({message:"Internal Server Error",success:false});
        
    }
}



export {loginUser,registerUser}