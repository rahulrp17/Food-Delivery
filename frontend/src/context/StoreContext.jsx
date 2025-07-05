import axios from "axios";
import { useEffect } from "react";
import { createContext, useState } from "react";

export const StoreContext = createContext(null);

const StoreContextProvider = (props) => {
  const [cartItems, setCartItems] = useState({});
  const url = "https://food-del-backend-393c.onrender.com";
  const [token, setToken] = useState("");
  const [food_list, setFood_list] = useState([]);

  const addToCart = async(itemId) => {
    if (!cartItems[itemId]) {
      setCartItems((prev) => ({ ...prev, [itemId]: 1 }));
    } else {
      setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] + 1 }));
    }
    if(token){
     await axios.post(url+"/api/cart/addToCart",{itemId},{headers:{token:token}})
    }
  };

  const removeFromCart = async(itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: prev[itemId] - 1 }));
    if(token){
      await axios.post(url+"/api/cart/removeFromCart",{itemId},{headers:{token:token}})
    }
  };
  const getTotalCartAmount = () => {
    let total = 0;
    for (const item in cartItems) {
      if (cartItems[item] > 0) {
        let itemInf0 = food_list.find((product) => product._id === item);
        total += itemInf0.price * cartItems[item];
      }
    }
    return total;
  };

  const fetchFoodList = async () => {
    const response = await axios.get(url+'/api/food/list');
    setFood_list(response.data.data);
  };

  const loadCartData = async (token) => {
    if (token) {
      const response = await axios.post(url+"/api/cart/getCart",{},{headers:{token} });
      setCartItems(response.data.cartData);
    }
  };

  useEffect(() => {
    async function loadData() {
    await  fetchFoodList();
    if(localStorage.getItem("token")){
      setToken(localStorage.getItem("token"));
      await loadCartData(localStorage.getItem("token"));
    }
    
  }
  loadData()
  }, [token]);

  const contextValue = {
    category: "All",
    setCategory: () => {},
    food_list: food_list,
    cartItems,
    setCartItems,
    addToCart,
    removeFromCart,
    getTotalCartAmount,
    url,
    token,
    setToken,
  };

  return (
    <StoreContext.Provider value={contextValue}>
      {props.children}
    </StoreContext.Provider>
  );
};
export default StoreContextProvider;
