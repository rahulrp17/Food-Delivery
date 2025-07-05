import mongoose from "mongoose"
import { createAdminUser } from "../utils/createAdmin.js"

const connectDB= async()=>{
    try {
        await mongoose.connect("mongodb+srv://REDACTED").then(()=>
         createAdminUser(),
            console.log(`DB Connected`)
         )
    } catch (error) {
        console.log(error);
        // process.exit(1)
    }
}

export default connectDB;