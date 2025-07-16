
import React from 'react';
import './Loader.css'; 

const Loader = () => {
  return (
   <div  style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh'}}>
      <div className="spinner"></div>
    </div>
  );
};

export default Loader;
