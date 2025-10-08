'use client'
import {useState, useEffect, useRef} from 'react'

export default function Board(){

    return (
        <div className="flex flex-col   gap-8 justify-center items-center min-h-screen">

          {/* //  ToolBar */}

          <div className="flex flex-wrap justify-center gap-2 items-center" >
            <label>Color:</label>
            <input type="color" />

            <label>Thickness:</label>
            <input type="range"  min="1" max="20"/>

            <button className="px-3 py-2 bg-red-600 rounded-sm text-white cursor-pointer hover:bg-red-700 active:bg-red-600">Clear</button>
          </div>

          {/* //Canvas */}
          <canvas 
          className=" w-[90vw] 2xl:w-[80vw] border border-gray-400 bg-white rounded shadow-md cursor-crosshair"
          />
           
        </div>
    )
}