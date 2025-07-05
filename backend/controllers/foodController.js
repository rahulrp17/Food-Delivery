import foodModel from "../models/foodmodel.js";
import fs from "fs";



//add food item

const addFood=async(req,res)=>{
    try {
        const image_filename=`${req.file.filename}`
        const food =new foodModel({
        name:req.body.name,
        description:req.body.description,
        price:req.body.price,
        category:req.body.category,
        image:image_filename,
       })
       await food.save()
       res.json({message:"Food added successfully",success:true,data:food})
    } catch (error) {
        console.log(error);
        res.status(400).json({message:error.message,success:false})
    }
}

const listFood=async (req,res)=>{
    try {
        const food=await foodModel.find()
        res.json({message:"Food list fetched successfully",success:true,data:food})
    } catch (error) {
        console.log(error);
        res.status(400).json({message:error.message,success:false})
    }
}

const removeFood=async (req,res)=>{
    try {
        const food =await foodModel.findById(req.body._id)
        fs.unlink(`uploads/${food.image}`,()=>{})

        await foodModel.findByIdAndDelete(req.body._id)
        res.json({message:"Food deleted successfully",success:true,data:food})
    } catch (error) {
        console.log(error);
        res.status(400).json({message:error.message,success:false})
    }
}

export {addFood,listFood,removeFood}
