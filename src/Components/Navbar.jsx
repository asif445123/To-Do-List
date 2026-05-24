import React from 'react'

const Navbar = () => {
  return (
    <nav className='flex justify-around bg-indigo-600 text-white py-2'>
        <div className="logo">
            <spam className="font-bolt text-xl mx-9">iTask</spam>
        </div>
        <ul className='flex gap-8 mx-9'>
            <li className='cursor-pointer hover:font-bold transition-all'>Home</li>
            <li className='cursor-pointer hover:font-bold transition-all'>My Tasks</li>
        </ul>
    </nav>
  )
}

export default Navbar
