'use client'

import React, { useState, useRef, useEffect } from 'react'
import { SketchPicker } from 'react-color'
import { removeBackground } from '@imgly/background-removal'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const fonts = [
  { value: "Roboto", label: "Roboto" },
  { value: "Open Sans", label: "Open Sans" },
  { value: "Lato", label: "Lato" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Poppins", label: "Poppins" },
  { value: "Oswald", label: "Oswald" },
  { value: "Source Sans Pro", label: "Source Sans Pro" },
  { value: "Raleway", label: "Raleway" },
  { value: "Ubuntu", label: "Ubuntu" },
  { value: "Merriweather", label: "Merriweather" },
]

export default function TextBetweenImageLayers() {
  const [imageUrl, setImageUrl] = useState('')
  const [text, setText] = useState('Your Text Here')
  const [fontSize, setFontSize] = useState(48)
  const [fontFamily, setFontFamily] = useState('Roboto')
  const [textColor, setTextColor] = useState('#000000')
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 })
  const [showTextColorPicker, setShowTextColorPicker] = useState(false)
  const [showShadowColorPicker, setShowShadowColorPicker] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [foregroundImage, setForegroundImage] = useState<HTMLImageElement | null>(null)
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dropShadow, setDropShadow] = useState({
    enabled: false,
    color: '#000000',
    blur: 4,
    offsetX: 2,
    offsetY: 2
  })
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const link = document.createElement('link')
    link.href = `https://fonts.googleapis.com/css2?family=${fonts.map(font => font.value.replace(' ', '+')).join('&family=')}&display=swap`
    link.rel = 'stylesheet'
    document.head.appendChild(link)

    return () => {
      document.head.removeChild(link)
    }
  }, [])

  useEffect(() => {
    if (backgroundImage && foregroundImage) {
      drawCanvas()
    }
  }, [backgroundImage, foregroundImage, text, fontSize, fontFamily, textColor, textPosition, dropShadow])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !backgroundImage || !foregroundImage) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = backgroundImage.width
    canvas.height = backgroundImage.height

    ctx.drawImage(backgroundImage, 0, 0)

    ctx.font = `${fontSize}px "${fontFamily}"`
    ctx.fillStyle = textColor
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (dropShadow.enabled) {
      ctx.shadowColor = dropShadow.color
      ctx.shadowBlur = dropShadow.blur
      ctx.shadowOffsetX = dropShadow.offsetX
      ctx.shadowOffsetY = dropShadow.offsetY
    } else {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }

    ctx.fillText(text, textPosition.x, textPosition.y)

    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0

    ctx.drawImage(foregroundImage, 0, 0)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setIsLoading(true)
      setError('')
      try {
        const originalImageUrl = URL.createObjectURL(file)
        setImageUrl(originalImageUrl)

        const blob = await removeBackground(file)
        const foregroundUrl = URL.createObjectURL(blob)

        const bgImage = await loadImage(originalImageUrl)
        const fgImage = await loadImage(foregroundUrl)

        setBackgroundImage(bgImage)
        setForegroundImage(fgImage)
        setTextPosition({ x: bgImage.width / 2, y: bgImage.height / 2 })
      } catch (err) {
        setError('Failed to process image. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }
  }

  const loadImage = (url: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const link = document.createElement('a')
    link.download = 'text-between-image-layers.png'
    link.href = canvas.toDataURL()
    link.click()
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setIsDragging(true)
    setDragOffset({
      x: textPosition.x - x,
      y: textPosition.y - y
    })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    setTextPosition({
      x: Math.max(0, Math.min(canvas.width, x + dragOffset.x)),
      y: Math.max(0, Math.min(canvas.height, y + dragOffset.y))
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div>
            <Label htmlFor="imageUpload">Upload Image</Label>
            <Input id="imageUpload" type="file" onChange={handleImageUpload} accept="image/*" disabled={isLoading} />
          </div>
          <div>
            <Label htmlFor="text">Text</Label>
            <Input id="text" type="text" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fontSize">Font Size</Label>
            <Input id="fontSize" type="number" value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} min="1" max="200" />
          </div>
          <div>
            <Label htmlFor="fontFamily">Font Family</Label>
            <Select value={fontFamily} onValueChange={setFontFamily}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a font" />
              </SelectTrigger>
              <SelectContent>
                {fonts.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="textColor">Text Color</Label>
            <div className="flex items-center space-x-2">
              <div
                className="w-10 h-10 border border-gray-300 cursor-pointer"
                style={{ backgroundColor: textColor }}
                onClick={() => setShowTextColorPicker(!showTextColorPicker)}
              />
              <span>{textColor}</span>
            </div>
            {showTextColorPicker && (
              <div className="absolute z-10">
                <SketchPicker color={textColor} onChange={(color) => setTextColor(color.hex)} />
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="dropShadowToggle">Drop Shadow</Label>
            <Switch
              id="dropShadowToggle"
              checked={dropShadow.enabled}
              onCheckedChange={(checked) => setDropShadow(prev => ({ ...prev, enabled: checked }))}
            />
          </div>
          {dropShadow.enabled && (
            <>
              <div>
                <Label htmlFor="dropShadowColor">Shadow Color</Label>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-10 h-10 border border-gray-300 cursor-pointer"
                    style={{ backgroundColor: dropShadow.color }}
                    onClick={() => setShowShadowColorPicker(!showShadowColorPicker)}
                  />
                  <span>{dropShadow.color}</span>
                </div>
                {showShadowColorPicker && (
                  <div className="absolute z-10">
                    <SketchPicker
                      color={dropShadow.color}
                      onChange={(color) => setDropShadow(prev => ({ ...prev, color: color.hex }))}
                    />
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="dropShadowBlur">Shadow Blur</Label>
                <Slider
                  id="dropShadowBlur"
                  min={0}
                  max={20}
                  step={1}
                  value={[dropShadow.blur]}
                  onValueChange={(value) => setDropShadow(prev => ({ ...prev, blur: value[0] }))}
                />
              </div>
              <div>
                <Label htmlFor="dropShadowOffsetX">Shadow Offset X</Label>
                <Slider
                  id="dropShadowOffsetX"
                  min={-20}
                  max={20}
                  step={1}
                  value={[dropShadow.offsetX]}
                  onValueChange={(value) => setDropShadow(prev => ({ ...prev, offsetX: value[0] }))}
                />
              </div>
              <div>
                <Label htmlFor="dropShadowOffsetY">Shadow Offset Y</Label>
                <Slider
                  id="dropShadowOffsetY"
                  min={-20}
                  max={20}
                  step={1}
                  value={[dropShadow.offsetY]}
                  onValueChange={(value) => setDropShadow(prev => ({ ...prev, offsetY: value[0] }))}
                />
              </div>
            </>
          )}
          <Button onClick={handleDownload} disabled={!backgroundImage || !foregroundImage}>Download Image</Button>
        </div>
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <canvas
              ref={canvasRef}
              className="border border-gray-300 w-full h-auto cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          )}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}