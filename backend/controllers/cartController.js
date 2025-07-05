import userModel from "../models/userModel.js";



//add to cart
const addToCart=async(req,res)=>{
    try {
        const userData= await userModel.findById(req.body.userId)
        const cartData=userData.cartData
        if(!cartData[req.body.itemId]){
            cartData[req.body.itemId]=1
        }
        else{
            cartData[req.body.itemId]+=1
        }
        await userModel.findByIdAndUpdate(req.body.userId,{cartData:cartData})

        res.json({message:"Food added to cart successfully",success:true,cartData})
    } catch (error) {
        console.log(error);
        res.status(400).json({message:error.message,success:false})
    }
}

//remove from cart
const removeFromCart=async(req,res)=>{
    try {
       
        const userData=await userModel.findById(req.body.userId)
        const cartData=userData.cartData
        if(cartData[req.body.itemId]>0){
            cartData[req.body.itemId]-=1;
        }
        const user=await userModel.findById(req.body.userId)
        user.cartData=cartData
        if(user.cartData[req.body.itemId]==0){
            delete user.cartData[req.body.itemId]
        }
        await user.save()
        res.json({message:"Food removed from cart successfully",success:true,data:user.cartData})
    } catch (error) {
        console.log(error);
        res.status(400).json({message:error.message,success:false})
    }
}

//get cart
const getCart=async(req,res)=>{
    try {
        
        const userData=await userModel.findById(req.body.userId)
        let cartData=userData.cartData
        res.json({message:"Cart fetched successfully",success:true,cartData})
    } catch (error) {
        console.log(error);
        res.status(400).json({message:error.message,success:false})
    }
}

export {addToCart,removeFromCart,getCart}