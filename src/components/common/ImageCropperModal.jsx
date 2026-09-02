import { useState, useRef, useEffect, useCallback } from 'react'
import { MorphIcon } from 'morphicons/react';
import { ZoomIn, ZoomOut, RotateCw, RotateCcw, RefreshCw, Check, X, Crop, Move } from 'lucide';
import Spinner from './Spinner'

export default function ImageCropperModal({ imageSrc, onCropComplete, onClose }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [processing, setProcessing] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const touchStartDistRef = useRef(null)

  // Reset adjustments when a new image is loaded
  useEffect(() => {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
    setImgLoaded(false)
  }, [imageSrc])

  // Mouse Drag Handlers
  const handleMouseDown = (e) => {
    e.preventDefault()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    })
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }, [isDragging, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch Gesture Handlers (Mobile Pan & Pinch Zoom)
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true)
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      })
    } else if (e.touches.length === 2) {
      // Pinch to zoom start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      touchStartDistRef.current = dist
    }
  }

  const handleTouchMove = (e) => {
    if (e.touches.length === 1 && isDragging) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      })
    } else if (e.touches.length === 2 && touchStartDistRef.current) {
      // Pinch zoom in progress
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      )
      const factor = currentDist / touchStartDistRef.current
      setZoom((prev) => Math.min(Math.max(prev * (factor > 1 ? 1.02 : 0.98), 1), 3))
      touchStartDistRef.current = currentDist
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    touchStartDistRef.current = null
  }

  // Window listeners for smooth release outside viewport
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Perform High-Resolution Square/Circle Crop to Canvas
  const handleConfirmCrop = async () => {
    if (!imageRef.current || !containerRef.current) return
    setProcessing(true)

    try {
      const img = imageRef.current
      const CROP_SIZE = 512 // Output resolution: 512x512 px
      const VIEWPORT_SIZE = 240 // Display mask dimension in pixels

      const canvas = document.createElement('canvas')
      canvas.width = CROP_SIZE
      canvas.height = CROP_SIZE
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        throw new Error('Canvas context unavailable')
      }

      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'

      // Center of canvas
      ctx.translate(CROP_SIZE / 2, CROP_SIZE / 2)

      // Apply User Rotation
      ctx.rotate((rotation * Math.PI) / 180)

      // Scale factor mapping viewport pixels to output 512x512 canvas
      const scaleMultiplier = CROP_SIZE / VIEWPORT_SIZE

      // Position offsets mapped to canvas scale
      const mappedX = position.x * scaleMultiplier
      const mappedY = position.y * scaleMultiplier

      // Calculate rendered dimensions of image within viewport
      const imgAspect = img.naturalWidth / img.naturalHeight
      let baseWidth, baseHeight
      if (imgAspect >= 1) {
        baseHeight = VIEWPORT_SIZE
        baseWidth = VIEWPORT_SIZE * imgAspect
      } else {
        baseWidth = VIEWPORT_SIZE
        baseHeight = VIEWPORT_SIZE / imgAspect
      }

      const drawWidth = baseWidth * zoom * scaleMultiplier
      const drawHeight = baseHeight * zoom * scaleMultiplier

      // Apply user pan coordinates relative to center
      ctx.translate(mappedX, mappedY)

      // Draw the image centered
      ctx.drawImage(
        img,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      )

      // Convert canvas to Blob & Data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            onCropComplete({ blob, dataUrl })
          } else {
            onCropComplete({ blob: null, dataUrl })
          }
          setProcessing(false)
        },
        'image/jpeg',
        0.92
      )
    } catch (err) {
      console.error('Crop processing failed:', err)
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in font-['Gambarino',system-ui,sans-serif]">
      <div className="bg-[#ffffff] text-[#0f172a] w-full max-w-md rounded-[24px] shadow-2xl border border-[#e2e8f0] overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e2e8f0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#e6f2ec] text-[#005a36] flex items-center justify-center font-bold">
              <MorphIcon icon={Crop} size={18} />
            </div>
            <div>
              <h3 className="font-['Source_Serif_4',Georgia,serif] text-base font-bold text-[#0f172a]">
                Adjust & Crop Photo
              </h3>
              <p className="text-[11px] text-[#64748b]">Drag to reposition, zoom or rotate</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={processing}
            className="p-1.5 rounded-xl text-[#64748b] hover:text-[#0f172a] hover:bg-[#f1f5f9] transition-colors"
          >
            <MorphIcon icon={X} size={18} />
          </button>
        </div>

        {/* Viewport & Cropping Area (Cleanly Isolated to Viewport Box) */}
        <div className="relative overflow-hidden p-6 flex flex-col items-center bg-[#090d16] select-none">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="relative w-[240px] h-[240px] rounded-full overflow-hidden cursor-grab active:cursor-grabbing select-none border-2 border-white/90 shadow-lg touch-none bg-black flex items-center justify-center"
          >
            {/* Guide Grid Crosshairs */}
            <div className="absolute inset-0 pointer-events-none z-10 grid grid-cols-3 grid-rows-3 border border-white/20">
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-r border-b border-white/20"></div>
              <div className="border-b border-white/20"></div>
              <div className="border-r border-white/20"></div>
              <div className="border-r border-white/20"></div>
              <div></div>
            </div>

            {/* Transformable Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              onLoad={() => setImgLoaded(true)}
              draggable={false}
              className="max-w-none transition-transform duration-75 ease-out select-none pointer-events-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                minWidth: '240px',
                minHeight: '240px',
                objectFit: 'contain'
              }}
            />

            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                <Spinner size="md" />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-white/80 text-[11px] mt-4 font-medium">
            <MorphIcon icon={Move} size={12} />
            <span>Drag image to adjust framing</span>
          </div>
        </div>

        {/* Controls Bar (Theme-Adaptive & Unobstructed) */}
        <div className="p-5 space-y-4 bg-[#ffffff]">
          {/* Zoom Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-[#64748b]">
              <span className="flex items-center gap-1.5">
                <MorphIcon icon={ZoomIn} size={14} /> Zoom Level
              </span>
              <span className="font-mono text-xs text-[#005a36] font-bold">
                {Math.round(zoom * 100)}%
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setZoom(prev => Math.max(prev - 0.15, 1))}
                className="btn-secondary p-2 rounded-xl"
                title="Zoom Out"
              >
                <MorphIcon icon={ZoomOut} size={15} />
              </button>
              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-[#005a36] h-2 bg-[#cbd5e1] rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom(prev => Math.min(prev + 0.15, 3))}
                className="btn-secondary p-2 rounded-xl"
                title="Zoom In"
              >
                <MorphIcon icon={ZoomIn} size={15} />
              </button>
            </div>
          </div>

          {/* Action Tools (Rotate, Reset) */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setRotation(prev => (prev - 90 + 360) % 360)}
              className="btn-secondary btn-sm"
            >
              <MorphIcon icon={RotateCcw} size={14} />
              <span>Rotate Left</span>
            </button>
            <button
              type="button"
              onClick={() => setRotation(prev => (prev + 90) % 360)}
              className="btn-secondary btn-sm"
            >
              <MorphIcon icon={RotateCw} size={14} />
              <span>Rotate Right</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1)
                setRotation(0)
                setPosition({ x: 0, y: 0 })
              }}
              className="btn-secondary btn-sm"
              title="Reset Zoom & Position"
            >
              <MorphIcon icon={RefreshCw} size={14} />
              <span>Reset</span>
            </button>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e2e8f0]">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="btn-secondary px-5 py-2.5 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={processing}
              className="btn-primary px-6 py-2.5 rounded-xl"
            >
              {processing ? <Spinner size="sm" /> : <MorphIcon icon={Check} size={16} />}
              <span>Apply & Save Photo</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
