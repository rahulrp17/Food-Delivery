import userModel from "../models/userModel.js";
import ApiError from "../utils/apiError.js";

const addToCart = async (req, res, next) => {
  try {
    const { itemId } = req.body;
    if (!itemId) {
      throw ApiError.badRequest("Item id is required");
    }

    const userData = await userModel.findById(req.body.userId);
    if (!userData) {
      throw ApiError.notFound("User not found");
    }

    const cartData = userData.cartData || {};
    const currentQuantity = Number(cartData[itemId]) || 0;
    cartData[itemId] = currentQuantity + 1;

    await userModel.findByIdAndUpdate(req.body.userId, { cartData });

    res.json({ message: "Food added to cart successfully", success: true, cartData });
  } catch (error) {
    next(error);
  }
};

const removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.body;
    if (!itemId) {
      throw ApiError.badRequest("Item id is required");
    }

    const user = await userModel.findById(req.body.userId);
    if (!user) {
      throw ApiError.notFound("User not found");
    }

    const cartData = user.cartData || {};
    if (Number(cartData[itemId]) > 0) {
      cartData[itemId] -= 1;
    }

    if (Number(cartData[itemId]) <= 0) {
      delete cartData[itemId];
    }

    user.cartData = cartData;
    await user.save();

    res.json({ message: "Food removed from cart successfully", success: true, data: user.cartData });
  } catch (error) {
    next(error);
  }
};

const getCart = async (req, res, next) => {
  try {
    const userData = await userModel.findById(req.body.userId);
    if (!userData) {
      throw ApiError.notFound("User not found");
    }

    res.json({ message: "Cart fetched successfully", success: true, cartData: userData.cartData || {} });
  } catch (error) {
    next(error);
  }
};

export { addToCart, removeFromCart, getCart };
