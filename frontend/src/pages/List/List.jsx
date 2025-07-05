import React, { useEffect, useState } from "react";
import "./List.css";
import axios from "axios";
import { toast } from "react-toastify";
const List = () => {
  const url = "http://localhost:4000";
  const [list, setList] = useState([]);

  const fetchList = async () => {
    const response = await axios.get(`${url}/api/food/list`);
    if (response.data.success) {
      setList(response.data.data);
    } else {
      toast.error(response.data.message);
    }
  };

  const removeFood = async(foodId) => {
    const response = await axios.post(`${url}/api/food/remove`, {
      _id: foodId,
    });
    console.log(response)
    await fetchList();
    if(response.data.success){
      toast.success("Food Deleted Successfully")
    }
    else{
      toast.error(response.error)
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  return (
    <div className="list add flex-col">
      <h1>All Food List</h1>
      <div className="list-table">
        <div className="list-table-format title">
          <h3>Image</h3>
          <h3>Name</h3>
          <h3>Category</h3>
          <h3>Price</h3>
          <h3>Action</h3>
        </div>
        {list.map((item, index) => {
          return (
            <div key={index} className="list-table-format">
              <img src={`${url}/images/` + item.image} alt="" />
              <p>{item.name}</p>
              <p>{item.category}</p>
              <p>${item.price}</p>
              <p className="curser" onClick={() => removeFood(item._id)}>
                X
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default List;
