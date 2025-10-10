'use client'
import { useState, useEffect, useRef } from 'react'

export default function Board() {
  const [color, setColor] = useState('#000000')
  const [thickness, setThickness] = useState(5)
  const [isDrawing, setIsDrawing] = useState(false)

  const canvasRef = useRef(null)
  const ctxRef = useRef(null)

  // 🖌️ Initialize canvas and context
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    // Set dynamic canvas dimensions
    // canvas.width = window.innerWidth * 0.9
    // canvas.height = window.innerHeight * 0.8

    // Basic brush settings
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color
    ctx.lineWidth = thickness
    ctxRef.current = ctx
  }, [])

  // 🎨 Update brush when color or thickness changes
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = color
      ctxRef.current.lineWidth = thickness
    }
  }, [color, thickness])

  // 📍 Get mouse or touch coordinates
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()

    // Mouse event
    if (e.nativeEvent && e.nativeEvent.offsetX !== undefined) {
      return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
    }

    // Touch event
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }

    return { x: 0, y: 0 }
  }

  // 🟢 Start Drawing
  const startDrawing = (e) => {
    e.preventDefault()
    const { x, y } = getCoordinates(e)
    const ctx = ctxRef.current
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
  }

  // 🟡 Draw while moving
  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const { x, y } = getCoordinates(e)
    const ctx = ctxRef.current
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  // 🔴 Stop Drawing
  const stopDrawing = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const ctx = ctxRef.current
    ctx.closePath()
    setIsDrawing(false)
  }

  // 🧹 Clear Canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  // 💾 Save Drawing
const saveDrawing = ()=>{
  const canvas = canvasRef.current 
  const imageUrl = canvas.toDataURL('image/png')

  const link = document.createElement('a')
  link.download = 'my-drawing.png'
  link.href = imageUrl
  link.click()

}

  return (
    <div className="flex flex-col gap-8 justify-center items-center min-h-screen bg-gray-50">

      {/* 🧰 Toolbar */}
      <div className="flex flex-wrap justify-center gap-3 items-center">
        <label>🎨 Color:</label>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="cursor-pointer"
        />

        <label>🖌️ Thickness:</label>
        <input
          type="range"
          min="1"
          max="20"
          value={thickness}
          onChange={(e) => setThickness(e.target.value)}
          className="cursor-pointer"
        />

        <button
          onClick={clearCanvas}
          className="px-3 py-2 bg-red-600 rounded-sm text-white cursor-pointer hover:bg-red-700 active:bg-red-600"
        >
          Clear
        </button>
         <button
          onClick={saveDrawing}
          className="px-3 py-2 bg-green-600 rounded-sm text-white cursor-pointer hover:bg-green-700 active:bg-green-600"
        >
          Save Drawing
        </button>
      </div>

      {/* 🖼️ Canvas */}
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className=" w-[95vw] 2xl:w-[90vw] h-[80vh] border border-gray-400 bg-white rounded shadow-md cursor-crosshair"
      />
    </div>
  )
}
