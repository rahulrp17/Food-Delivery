import jwt from "jsonwebtoken";


const authMiddleware=async(req,res,next)=>{


    const{token}=req.headers
    console.log(token);
    
    if(!token){
        return res.status(401).json({message:"Unauthorized",success:false});
    }
    try {
        const decodedToken=jwt.verify(token,process.env.JWT_SECRET);
        req.body.userId=decodedToken.id;
        next();
    } catch (error) {
        return res.status(401).json({message:"Unauthorized Token",success:false});
    }
}

export const adminMiddleware=(...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.body.role)){
            return res.status(403).json({message:"Forbidden: Access Denied",success:false});
        }
        next();
    }
}

export default authMiddleware