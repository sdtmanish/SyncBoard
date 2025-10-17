'use client'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export default function Board() {
  const [color, setColor] = useState('#000000')
  const [thickness, setThickness] = useState(5)
  const [isDrawing, setIsDrawing] = useState(false)
  const [history, setHistory] = useState([])
  const [redoStack, setRedoStack] = useState([])

  const canvasRef = useRef(null)
  const ctxRef = useRef(null)
  const socketRef = useRef(null) // ✅ keep socket instance

  // 🖌️ Initialize Canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    const setCanvasSize = () => {
      const { offsetWidth, offsetHeight } = canvas
      const tempImage = canvas.toDataURL()
      canvas.width = offsetWidth
      canvas.height = offsetHeight
      const img = new window.Image()
      img.onload = () => ctx.drawImage(img, 0, 0)
      img.src = tempImage
    }

    setCanvasSize()
    window.addEventListener('resize', setCanvasSize)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = color
    ctx.lineWidth = thickness
    ctxRef.current = ctx

    const blank = canvas.toDataURL()
    setHistory([blank])

    return () => window.removeEventListener('resize', setCanvasSize)
  }, [])

  // 🎨 Update brush when color/thickness changes
  useEffect(() => {
    if (ctxRef.current) {
      ctxRef.current.strokeStyle = color
      ctxRef.current.lineWidth = thickness
    }
  }, [color, thickness])



useEffect(() => {
  const socket = io('http://localhost:5000')
  socketRef.current = socket

  // debug connect
  socket.on('connect', () => console.log('[socket] connected', socket.id))
  socket.on('disconnect', () => console.log('[socket] disconnected'))

  // When another user starts drawing
  socket.on('beginPath', ({ x, y }) => {
    //console.log('[recv] beginPath', x, y)
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.beginPath()
    ctx.moveTo(x, y)
  })

  // When another user draws
  socket.on('draw', ({ x, y, color: c, thickness: t }) => {
    //console.log('[recv] draw', x, y, c, t)
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.strokeStyle = c
    ctx.lineWidth = t
    ctx.lineTo(x, y)
    ctx.stroke()
  })

  // clear
  socket.on('clear', () => {
    console.log('[recv] clear')
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    if (!ctx || !canvas) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  })

  // undo / redo receive — expect { image }
  socket.on('undo', (data) => {
    console.log('[recv] undo', !!data?.image)
    if (data && data.image) drawFromDataURL(data.image)
  })

  socket.on('redo', (data) => {
    console.log('[recv] redo', !!data?.image)
    if (data && data.image) drawFromDataURL(data.image)
  })

  return () => {
    socket.off() // remove all listeners
    socket.disconnect()
  }
}, [])

  // 📍 Get coordinates
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      }
    }
    if (e.nativeEvent) {
      return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY }
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

  // 🟢 Tell others where to start
  socketRef.current.emit('beginPath', { x, y })
}

  // 🟡 Draw (send data)
const draw = (e) => {
  if (!isDrawing) return
  e.preventDefault()
  const { x, y } = getCoordinates(e)
  const ctx = ctxRef.current
  ctx.lineTo(x, y)
  ctx.stroke()

  // ✅ Send draw event to others
  socketRef.current.emit('draw', { x, y, color, thickness })
}

  // 🔴 Stop Drawing (save snapshot)
  const stopDrawing = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    ctxRef.current.closePath()
    setIsDrawing(false)

    const canvas = canvasRef.current
    const data = canvas.toDataURL()
    setHistory((prev) => [...prev, data])
    setRedoStack([])
  }

 const unDo = (isRemote = false) => {
  // defensive: ensure history exists and has previous
  if (!Array.isArray(history) || history.length <= 1) {
    console.log('[undo] nothing to undo')
    return
  }

  const newHistory = [...history]
  const last = newHistory.pop()
  setRedoStack((r) => [...r, last])
  setHistory(newHistory)

  const previous = newHistory[newHistory.length - 1]
  if (!previous) {
    console.warn('[undo] previous snapshot is undefined')
    return
  }
  console.log('[undo] applying previous snapshot, sending?', !isRemote)
  drawFromDataURL(previous)

  if (!isRemote && socketRef.current) {
    socketRef.current.emit('undo', { image: previous })
    console.log('[emit] undo', !!previous)
  }
}

const reDo = (isRemote = false) => {
  if (!Array.isArray(redoStack) || redoStack.length === 0) {
    console.log('[redo] nothing to redo')
    return
  }

  const newRedo = [...redoStack]
  const restored = newRedo.pop()
  setRedoStack(newRedo)
  setHistory((h) => [...h, restored])
  console.log('[redo] applying restored snapshot, sending?', !isRemote)
  drawFromDataURL(restored)

  if (!isRemote && socketRef.current) {
    socketRef.current.emit('redo', { image: restored })
    console.log('[emit] redo', !!restored)
  }
}


  // 🖼️ Draw from saved snapshot
  const drawFromDataURL = (dataURL) => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    const img = new window.Image()
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
    img.src = dataURL || ''
  }

  // 🧹 Clear (notify others)
  const clearCanvas = () => {
    const canvas = canvasRef.current
    const ctx = ctxRef.current
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const blank = canvas.toDataURL()
    setHistory([blank])
    setRedoStack([])

    // ✅ Notify all users
    socketRef.current.emit('clear')
  }

  const saveDrawing = () => {
  const canvas = canvasRef.current
  const ctx = canvas.getContext('2d')

  // 🖼️ Create a temporary canvas (so we don’t modify the original)
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')

  // Match the size of the main canvas
  tempCanvas.width = canvas.width
  tempCanvas.height = canvas.height

  // 🎨 Fill with white background (or any color)
  tempCtx.fillStyle = 'white'
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)

  // 🖌️ Draw your existing content on top
  tempCtx.drawImage(canvas, 0, 0)

  // 💾 Export as PNG with white background
  const imageUrl = tempCanvas.toDataURL('image/png')
  const link = document.createElement('a')
  link.download = 'my-drawing.png'
  link.href = imageUrl
  link.click()
}


  return (
    <div className="flex flex-col gap-8 justify-center items-center min-h-screen bg-gray-50">
      <div className="fixed top-4 left-4">
        <Image src="/assets/logo.png" width="30" height="30" alt="logo" />
      </div>

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
          onChange={(e) => setThickness(Number(e.target.value))}
          className="cursor-pointer"
        />

        <button
          onClick={unDo}
          className="px-3 py-2 bg-blue-500 rounded-sm text-white hover:bg-blue-600 cursor-pointer active:bg-blue-500"
        >
          ↩️ Undo
        </button>

        <button
          onClick={reDo}
          className="px-3 py-2 bg-blue-500 rounded-sm text-white hover:bg-blue-600 cursor-pointer active:bg-blue-500"
        >
          ↪️ Redo
        </button>

        <button
          onClick={clearCanvas}
          className="px-3 py-2 bg-red-600 rounded-sm text-white hover:bg-red-700 cursor-pointer active:bg-red-600"
        >
          Clear
        </button>

        <button
          onClick={saveDrawing}
          className="px-3 py-2 bg-green-600 rounded-sm text-white hover:bg-green-700 cursor-pointer active:bg-red-600"
        >
          Save Drawing
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="w-[95vw] 2xl:w-[90vw] h-[80vh] border border-gray-400 bg-white rounded shadow-md cursor-crosshair"
      />
    </div>
  )
}
