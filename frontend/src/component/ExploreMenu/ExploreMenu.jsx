import React from 'react'
import './ExploreMenu.css'
import {menu_list} from '../../assets/assets'

const ExploreMenu = ({category,setCategory}) => {
  // const filterMenu=menu_list.filter((item)=>item.category===category || category==="All")
  return (
    <div className='explore-menu' id='explore-menu'>
       <h1>Explore Our Menu</h1>
       <p className="explore-menu-text">Lorem ipsum dolor sit amet consectetur adipisicing elit. Similique doloribus id temporibus aliquid, iste ipsum! Debitis voluptates voluptatum aliquam, pariatur dolor, modi, eius itaque adipisci doloremque veritatis min</p>
       <div className="explore-menu-list">
        {menu_list.map((item,index)=>{
           return (
            <div onClick={()=>setCategory(prev=>prev===item.menu_name?"All":item.menu_name)} className='explore-menu-list-item' key={index}>
                <img className={category===item.menu_name?"explore-menu-list-item-active":""} src={item.menu_image} alt="" />
                <p>{item.menu_name}</p>
            </div>
           )
        }) }
       </div>
       <hr />
    </div>
  )
}

export default ExploreMenu
