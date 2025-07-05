import React from 'react'
import './AdminNavbar.css'
import { assets } from '../../assets/assets'

const Navbar = () => {
  return (
    <div className='admin-navbar'>
      <img src={assets.logo} alt="" className="logo" />
      <img className='profile' src={assets.profile_image} alt="" />
    </div>
  )
}

export default Navbar
