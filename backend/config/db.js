import mongoose from "mongoose"
import { createAdminUser } from "../utils/createAdmin.js"

const connectDB= async()=>{
    try {
        await mongoose.connect("mongodb+srv://rahul:rahul2004@cluster0.hdilbbh.mongodb.net/Ecom-Food-Del").then(()=>
         createAdminUser(),
            console.log(`DB Connected`)
         )
    } catch (error) {
        console.log(error);
        // process.exit(1)
    }
}

export default connectDB;