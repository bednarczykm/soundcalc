"use client"

import type React from "react"
import { Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRef, useState, useCallback, useEffect } from "react"
import type { AcousticPanel } from "@/components/stereo-calculator"
import { calculateSpeakerCorners, calculateCornerDistancesToFrontWall } from "@/components/speaker-corner-distances"

interface RoomDiagramProps {
  roomWidth: number
  roomLength: number
  leftSpeaker: { x: number; y: number }
  rightSpeaker: { x: number; y: number }
  listener: { x: number; y: number }
  actualAngle: number
  speakerWidth?: number
  speakerDepth?: number
  showAcousticTreatment?: boolean
  showDimensions?: boolean
  showAcousticCentre?: boolean
  showCornerDistances?: boolean
  acousticPanels?: AcousticPanel[]
  onDrag?: (element: "left" | "right" | "listener", x: number, y: number) => void
  lockSymmetry?: boolean
  toeInAngle?: number
  lockToeSymmetry?: boolean
  onCornerDataChange?: (
    data: {
      left: { LF: number; RF: number; LR: number; RR: number }
      right: { LF: number; RF: number; LR: number; RR: number }
    } | null,
  ) => void
}

export function RoomDiagram({
  roomWidth,
  roomLength,
  leftSpeaker,
  rightSpeaker,
  listener,
  actualAngle,
  speakerWidth = 0.3,
  speakerDepth = 0.4,
  showAcousticTreatment = false,
  showDimensions = true,
  showAcousticCentre = false,
  showCornerDistances = false,
  acousticPanels = [],
  onDrag,
  lockSymmetry = true,
  toeInAngle = 0,
  lockToeSymmetry = true,
  onCornerDataChange,
}: RoomDiagramProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<"left" | "right" | "listener" | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const padding = 100 // Increased from 80 to 100 to prevent dimension labels from being cut off
  const svgWidth = 500
  const svgHeight = 550

  const availableWidth = svgWidth - 2 * padding
  const availableHeight = svgHeight - 2 * padding
  const scale = Math.min(availableWidth / roomWidth, availableHeight / roomLength)

  const toSvg = (x: number, y: number) => ({
    x: padding + x * scale,
    y: padding + y * scale,
  })

  const toRoom = useCallback(
    (svgX: number, svgY: number) => ({
      x: (svgX - padding) / scale,
      y: (svgY - padding) / scale,
    }),
    [scale],
  )

  const roomTopLeft = toSvg(0, 0)
  const roomBottomRight = toSvg(roomWidth, roomLength)
  const leftSpeakerPos = toSvg(leftSpeaker.x, leftSpeaker.y)
  const rightSpeakerPos = toSvg(rightSpeaker.x, rightSpeaker.y)
  const listenerPos = toSvg(listener.x, listener.y)

  const speakerVisualWidth = Math.max(speakerWidth * scale, 12) // minimum 12px for visibility
  const speakerVisualDepth = Math.max(speakerDepth * scale, 14) // minimum 14px for visibility
  const listenerRadius = 14
  const roomVisualWidth = roomBottomRight.x - roomTopLeft.x

  const isListenerInRoom = listener.x >= 0 && listener.x <= roomWidth && listener.y >= 0 && listener.y <= roomLength

  // Drag handlers
  const handleMouseDown = useCallback(
    (element: "left" | "right" | "listener") => (e: React.MouseEvent) => {
      e.preventDefault()
      if (element === "right" && lockSymmetry) return
      setDragging(element)
    },
    [lockSymmetry],
  )

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging || !svgRef.current || !onDrag) return
      const rect = svgRef.current.getBoundingClientRect()
      const svgX = ((e.clientX - rect.left) / rect.width) * svgWidth
      const svgY = ((e.clientY - rect.top) / rect.height) * svgHeight
      const roomCoords = toRoom(svgX, svgY)
      onDrag(dragging, roomCoords.x, roomCoords.y)
    },
    [dragging, onDrag, toRoom],
  )

  const handleMouseUp = useCallback(() => setDragging(null), [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [dragging, handleMouseMove, handleMouseUp])

  const handleTouchStart = useCallback(
    (element: "left" | "right" | "listener") => (e: React.TouchEvent) => {
      e.preventDefault()
      if (element === "right" && lockSymmetry) return
      setDragging(element)
    },
    [lockSymmetry],
  )

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!dragging || !svgRef.current || !onDrag) return
      const touch = e.touches[0]
      const rect = svgRef.current.getBoundingClientRect()
      const svgX = ((touch.clientX - rect.left) / rect.width) * svgWidth
      const svgY = ((touch.clientY - rect.top) / rect.height) * svgHeight
      const roomCoords = toRoom(svgX, svgY)
      onDrag(dragging, roomCoords.x, roomCoords.y)
    },
    [dragging, onDrag, toRoom],
  )

  const handleTouchEnd = useCallback(() => setDragging(null), [])

  useEffect(() => {
    if (dragging) {
      window.addEventListener("touchmove", handleTouchMove, { passive: false })
      window.addEventListener("touchend", handleTouchEnd)
      return () => {
        window.removeEventListener("touchmove", handleTouchMove)
        window.removeEventListener("touchend", handleTouchEnd)
      }
    }
  }, [dragging, handleTouchMove, handleTouchEnd])

  // Fullscreen handlers
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange)
  }, [])

  const colors = {
    room: {
      fill: "#f8fafc",
      stroke: "#64748b",
    },
    speaker: {
      fill: "#1e293b",
      stroke: "#475569",
      activeStroke: "#3b82f6",
    },
    listener: {
      fill: "#3b82f6",
      stroke: "#2563eb",
      activeStroke: "#1e293b",
    },
    dimension: {
      line: "#64748b",
      text: "#334155",
      bg: "#ffffff",
      border: "#cbd5e1",
    },
    acoustic: {
      panel: "#f97316",
      bassTrap: "#8b5cf6",
      dimText: "#c2410c",
      dimBg: "#fff7ed",
      dimBorder: "#fdba74",
    },
    triangle: {
      line: "#3b82f6",
    },
    acousticCentre: {
      line: "#10b981",
      text: "#047857",
      bg: "#ecfdf5",
      border: "#6ee7b7",
      ghost: "#9ca3af",
    },
    toeInAxis: {
      line: "#6366f1",
      lineLight: "#a5b4fc",
    },
    cornerDistance: {
      line: "#8b5cf6",
      dot: "#7c3aed",
      text: "#5b21b6",
      bg: "#f5f3ff",
      border: "#c4b5fd",
    },
  }

  const arrowSize = 6

  const renderDimension = (
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    label: string,
    horizontal: boolean,
    color = colors.dimension,
    unit = "m",
    dashed = false,
  ) => {
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const displayLabel = `${label}${unit}`

    if (horizontal) {
      return (
        <g key={id}>
          {/* Line */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color.line}
            strokeWidth={1.5}
            strokeDasharray={dashed ? "4 3" : undefined}
          />
          {/* Arrows */}
          <polygon
            points={`${x1},${y1} ${x1 + arrowSize},${y1 - arrowSize / 2} ${x1 + arrowSize},${y1 + arrowSize / 2}`}
            fill={color.line}
          />
          <polygon
            points={`${x2},${y2} ${x2 - arrowSize},${y2 - arrowSize / 2} ${x2 - arrowSize},${y2 + arrowSize / 2}`}
            fill={color.line}
          />
          {/* End ticks */}
          <line x1={x1} y1={y1 - 6} x2={x1} y2={y1 + 6} stroke={color.line} strokeWidth={1.5} />
          <line x1={x2} y1={y2 - 6} x2={x2} y2={y2 + 6} stroke={color.line} strokeWidth={1.5} />
          {/* Label background */}
          <rect
            x={midX - 22}
            y={y1 - 10}
            width={44}
            height={18}
            fill={color.bg}
            stroke={color.border}
            strokeWidth={1}
            rx={4}
          />
          {/* Label text */}
          <text
            x={midX}
            y={y1 + 4}
            textAnchor="middle"
            fill={color.text}
            fontSize="11"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {displayLabel}
          </text>
        </g>
      )
    } else {
      return (
        <g key={id}>
          {/* Line */}
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color.line}
            strokeWidth={1.5}
            strokeDasharray={dashed ? "4 3" : undefined}
          />
          {/* Arrows */}
          <polygon
            points={`${x1},${y1} ${x1 - arrowSize / 2},${y1 + arrowSize} ${x1 + arrowSize / 2},${y1 + arrowSize}`}
            fill={color.line}
          />
          <polygon
            points={`${x2},${y2} ${x2 - arrowSize / 2},${y2 - arrowSize} ${x2 + arrowSize / 2},${y2 - arrowSize}`}
            fill={color.line}
          />
          {/* End ticks */}
          <line x1={x1 - 6} y1={y1} x2={x1 + 6} y2={y1} stroke={color.line} strokeWidth={1.5} />
          <line x1={x2 - 6} y1={y2} x2={x2 + 6} y2={y2} stroke={color.line} strokeWidth={1.5} />
          {/* Label background */}
          <rect
            x={x1 - 22}
            y={midY - 9}
            width={44}
            height={18}
            fill={color.bg}
            stroke={color.border}
            strokeWidth={1}
            rx={4}
          />
          {/* Label text */}
          <text
            x={x1}
            y={midY + 4}
            textAnchor="middle"
            fill={color.text}
            fontSize="11"
            fontWeight="600"
            fontFamily="system-ui, sans-serif"
          >
            {displayLabel}
          </text>
        </g>
      )
    }
  }

  // Filter panels by type
  const sidePanels = acousticPanels.filter((p) => p.type === "side")
  const frontPanels = acousticPanels.filter((p) => p.type === "front")
  const backPanels = acousticPanels.filter((p) => p.type === "back")
  const bassTraps = acousticPanels.filter((p) => p.type === "bass-trap")

  const toeInAxes = (() => {
    if (toeInAngle <= 0) return null

    const theta = (toeInAngle * Math.PI) / 180

    // Direction vectors (pointing towards listener, y- is towards front wall where listener is)
    const dirL = { dx: Math.sin(theta), dy: Math.cos(theta) }
    const dirR = { dx: -Math.sin(theta), dy: Math.cos(theta) }

    // Calculate line length (extend to room boundary or max distance)
    const maxLength = Math.max(roomWidth, roomLength) * 2

    // Left speaker axis end point
    const leftEndX = leftSpeaker.x + dirL.dx * maxLength
    const leftEndY = leftSpeaker.y + dirL.dy * maxLength

    // Right speaker axis end point
    const rightEndX = rightSpeaker.x + dirR.dx * maxLength
    const rightEndY = rightSpeaker.y + dirR.dy * maxLength

    // Calculate intersection point
    const t = (rightSpeaker.x - leftSpeaker.x) / (2 * Math.sin(theta))
    const crossY = leftSpeaker.y + t * Math.cos(theta) // Positive because pointing towards listener
    const crossX = roomWidth / 2

    return {
      left: {
        start: toSvg(leftSpeaker.x, leftSpeaker.y),
        end: toSvg(leftEndX, leftEndY),
      },
      right: {
        start: toSvg(rightSpeaker.x, rightSpeaker.y),
        end: toSvg(rightEndX, rightEndY),
      },
      crossPoint: crossY > 0 && crossY < roomLength ? toSvg(crossX, crossY) : null,
    }
  })()

  const cornerOverlayData = (() => {
    if (!showCornerDistances) return null

    const leftCorners = calculateSpeakerCorners(
      leftSpeaker.x,
      leftSpeaker.y,
      speakerWidth,
      speakerDepth,
      toeInAngle,
      false,
    )
    const rightCorners = calculateSpeakerCorners(
      rightSpeaker.x,
      rightSpeaker.y,
      speakerWidth,
      speakerDepth,
      toeInAngle,
      true,
    )
    const leftDistances = calculateCornerDistancesToFrontWall(leftCorners)
    const rightDistances = calculateCornerDistancesToFrontWall(rightCorners)

    return {
      left: {
        corners: leftCorners,
        distances: leftDistances,
      },
      right: {
        corners: rightCorners,
        distances: rightDistances,
      },
    }
  })()

  useEffect(() => {
    if (onCornerDataChange) {
      if (cornerOverlayData) {
        onCornerDataChange({
          left: cornerOverlayData.left.distances,
          right: cornerOverlayData.right.distances,
        })
      } else {
        onCornerDataChange(null)
      }
    }
  }, [cornerOverlayData, onCornerDataChange])

  const renderCornerDistanceOverlay = () => {
    if (!cornerOverlayData) return null

    const wallY = toSvg(0, 0).y // Front wall Y position in SVG coords
    const dimLineOffset = 25 // Offset for dimension lines above the wall
    const tickSize = 6 // Size of tick marks

    const allCorners = [
      ...Object.entries(cornerOverlayData.left.corners).map(([key, corner]) => ({
        key: `left-${key}`,
        corner,
        distance: cornerOverlayData.left.distances[key as keyof typeof cornerOverlayData.left.distances],
        speaker: "L",
        cornerType: key,
      })),
      ...Object.entries(cornerOverlayData.right.corners).map(([key, corner]) => ({
        key: `right-${key}`,
        corner,
        distance: cornerOverlayData.right.distances[key as keyof typeof cornerOverlayData.right.distances],
        speaker: "R",
        cornerType: key,
      })),
    ]

    const frontCornersOnly = allCorners.filter((c) => c.cornerType === "LF" || c.cornerType === "RF")

    // Sort front corners by x position for proper dimension line placement
    const sortedFrontCorners = [...frontCornersOnly].sort((a, b) => a.corner.x - b.corner.x)

    return (
      <g>
        {/* Helper lines from corners to wall (inside room) */}
        {allCorners.map(({ key, corner, cornerType }) => {
          const cornerSvg = toSvg(corner.x, corner.y)
          const wallSvg = toSvg(corner.x, 0)
          const isFront = cornerType === "LF" || cornerType === "RF"
          return (
            <g key={`helper-${key}`}>
              {/* Dashed line from corner to wall */}
              <line
                x1={cornerSvg.x}
                y1={cornerSvg.y}
                x2={wallSvg.x}
                y2={wallSvg.y}
                stroke={colors.cornerDistance.line}
                strokeWidth={1}
                strokeDasharray="3 3"
                opacity={isFront ? 0.6 : 0.3}
              />
              {/* Corner dot */}
              <circle
                cx={cornerSvg.x}
                cy={cornerSvg.y}
                r={3.5}
                fill={isFront ? colors.cornerDistance.dot : colors.cornerDistance.line}
                stroke="white"
                strokeWidth={1.5}
                opacity={isFront ? 1 : 0.6}
              />
              {/* Corner label (LF, RF, LR, RR) - only for front corners */}
              {isFront && (
                <text
                  x={cornerSvg.x}
                  y={cornerSvg.y + 12}
                  textAnchor="middle"
                  fill={colors.cornerDistance.text}
                  fontSize="7"
                  fontWeight="500"
                  fontFamily="system-ui, sans-serif"
                  opacity={0.8}
                >
                  {cornerType}
                </text>
              )}
            </g>
          )
        })}

        {sortedFrontCorners.map((item) => {
          const wallSvg = toSvg(item.corner.x, 0)
          const distCm = (item.distance * 100).toFixed(1)
          const dimY = wallY - dimLineOffset

          return (
            <g key={`dim-${item.key}`}>
              {/* Vertical extension line from wall to dimension line area */}
              <line
                x1={wallSvg.x}
                y1={wallY}
                x2={wallSvg.x}
                y2={dimY - tickSize}
                stroke={colors.cornerDistance.line}
                strokeWidth={0.75}
                opacity={0.6}
              />

              {/* Tick mark at dimension line */}
              <line
                x1={wallSvg.x}
                y1={dimY - tickSize / 2}
                x2={wallSvg.x}
                y2={dimY + tickSize / 2}
                stroke={colors.cornerDistance.dot}
                strokeWidth={1.5}
              />

              {/* Distance label */}
              <text
                x={wallSvg.x}
                y={dimY - tickSize - 3}
                textAnchor="middle"
                fill={colors.cornerDistance.text}
                fontSize="8"
                fontWeight="600"
                fontFamily="system-ui, sans-serif"
              >
                {distCm}
              </text>
            </g>
          )
        })}

        {(() => {
          if (sortedFrontCorners.length === 0) return null
          const minX = Math.min(...sortedFrontCorners.map((c) => toSvg(c.corner.x, 0).x))
          const maxX = Math.max(...sortedFrontCorners.map((c) => toSvg(c.corner.x, 0).x))
          const lineY = wallY - dimLineOffset - 8

          return (
            <line
              x1={minX - 10}
              y1={lineY}
              x2={maxX + 10}
              y2={lineY}
              stroke={colors.cornerDistance.border}
              strokeWidth={0.5}
              opacity={0.4}
            />
          )
        })()}

        <text
          x={toSvg(roomWidth / 2, 0).x}
          y={wallY - dimLineOffset - 22}
          textAnchor="middle"
          fill={colors.cornerDistance.text}
          fontSize="7"
          fontFamily="system-ui, sans-serif"
          opacity={0.7}
        >
          OdlegÅoÅci przednich rogÃ³w (LF/RF) od Åciany frontowej
        </text>
      </g>
    )
  }

  return (
    <div ref={containerRef} className={`relative bg-background rounded-lg ${isFullscreen ? "h-full" : ""}`}>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleFullscreen}
        className="absolute top-2 right-2 z-10 bg-white/90 hover:bg-white shadow-sm"
        title={isFullscreen ? "Zamknij peÅny ekran" : "PeÅny ekran"}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className={`w-full ${isFullscreen ? "h-full" : "h-auto"}`}
        style={{ touchAction: "none" }}
        onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleMouseUp}
      >
        {/* Background */}
        <rect x={0} y={0} width={svgWidth} height={svgHeight} fill="white" />

        {/* Room rectangle */}
        <rect
          x={roomTopLeft.x}
          y={roomTopLeft.y}
          width={roomBottomRight.x - roomTopLeft.x}
          height={roomBottomRight.y - roomTopLeft.y}
          fill={colors.room.fill}
          stroke={colors.room.stroke}
          strokeWidth={2}
        />

        {/* Wall labels */}
        <text
          x={(roomTopLeft.x + roomBottomRight.x) / 2}
          y={roomTopLeft.y - 12}
          textAnchor="middle"
          fill="#64748b"
          fontSize="13"
          fontWeight="500"
          fontFamily="system-ui, sans-serif"
        >
          Åciana frontowa
        </text>

        <g>
          {/* Left speaker label */}
          <rect
            x={roomTopLeft.x + 15}
            y={roomTopLeft.y - 95}
            width={24}
            height={20}
            fill="white"
            stroke="#cbd5e1"
            strokeWidth={1}
            rx={4}
          />
          <text
            x={roomTopLeft.x + 27}
            y={roomTopLeft.y - 81}
            textAnchor="middle"
            fill="#1e293b"
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            L
          </text>
          {/* Right speaker label */}
          <rect
            x={roomTopLeft.x + roomVisualWidth - 39}
            y={roomTopLeft.y - 95}
            width={24}
            height={20}
            fill="white"
            stroke="#cbd5e1"
            strokeWidth={1}
            rx={4}
          />
          <text
            x={roomTopLeft.x + roomVisualWidth - 27}
            y={roomTopLeft.y - 81}
            textAnchor="middle"
            fill="#1e293b"
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
          >
            R
          </text>
        </g>

        <text
          x={(roomTopLeft.x + roomBottomRight.x) / 2}
          y={roomBottomRight.y + 20}
          textAnchor="middle"
          fill="#64748b"
          fontSize="13"
          fontWeight="500"
          fontFamily="system-ui, sans-serif"
        >
          Åciana tylna
        </text>

        {/* Acoustic panels - render first so dimensions appear on top */}
        {showAcousticTreatment && (
          <>
            {/* Bass traps */}
            {bassTraps.map((panel, index) => {
              const pos = toSvg(panel.centerX, panel.centerY)
              const trapSize = 16
              let points = ""
              if (panel.centerX === 0 && panel.centerY === 0) {
                points = `${pos.x},${pos.y} ${pos.x + trapSize},${pos.y} ${pos.x},${pos.y + trapSize}`
              } else if (panel.centerX === roomWidth && panel.centerY === 0) {
                points = `${pos.x},${pos.y} ${pos.x - trapSize},${pos.y} ${pos.x},${pos.y + trapSize}`
              } else if (panel.centerX === 0 && panel.centerY === roomLength) {
                points = `${pos.x},${pos.y} ${pos.x + trapSize},${pos.y} ${pos.x},${pos.y - trapSize}`
              } else {
                points = `${pos.x},${pos.y} ${pos.x - trapSize},${pos.y} ${pos.x},${pos.y - trapSize}`
              }
              return <polygon key={`bass-${index}`} points={points} fill={colors.acoustic.bassTrap} opacity={0.85} />
            })}

            {/* Side panels */}
            {sidePanels.map((panel, index) => {
              const pos = toSvg(panel.centerX, panel.centerY)
              const panelHeightSvg = panel.width * scale
              return (
                <rect
                  key={`side-${index}`}
                  x={panel.wall === "left" ? pos.x : pos.x - 10}
                  y={pos.y - panelHeightSvg / 2}
                  width={10}
                  height={panelHeightSvg}
                  fill={colors.acoustic.panel}
                  opacity={0.9}
                  rx={2}
                />
              )
            })}

            {/* Front panels */}
            {frontPanels.map((panel, index) => {
              const pos = toSvg(panel.centerX, panel.centerY)
              const panelWidthSvg = panel.width * scale
              return (
                <rect
                  key={`front-${index}`}
                  x={pos.x - panelWidthSvg / 2}
                  y={pos.y}
                  width={panelWidthSvg}
                  height={10}
                  fill={colors.acoustic.panel}
                  opacity={0.9}
                  rx={2}
                />
              )
            })}

            {/* Back panel */}
            {backPanels.map((panel, index) => {
              const pos = toSvg(panel.centerX, panel.centerY)
              const panelWidthSvg = panel.width * scale
              return (
                <rect
                  key={`back-${index}`}
                  x={pos.x - panelWidthSvg / 2}
                  y={pos.y - 10}
                  width={panelWidthSvg}
                  height={10}
                  fill={colors.acoustic.panel}
                  opacity={0.9}
                  rx={2}
                />
              )
            })}
          </>
        )}

        {toeInAxes && (
          <>
            {/* Left speaker axis */}
            <line
              x1={toeInAxes.left.start.x}
              y1={toeInAxes.left.start.y}
              x2={toeInAxes.left.end.x}
              y2={toeInAxes.left.end.y}
              stroke={colors.toeInAxis.line}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.6}
              clipPath={`url(#roomClip)`}
            />
            {/* Right speaker axis */}
            <line
              x1={toeInAxes.right.start.x}
              y1={toeInAxes.right.start.y}
              x2={toeInAxes.right.end.x}
              y2={toeInAxes.right.end.y}
              stroke={colors.toeInAxis.line}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.6}
              clipPath={`url(#roomClip)`}
            />
            {/* Intersection point marker */}
            {toeInAxes.crossPoint && (
              <circle
                cx={toeInAxes.crossPoint.x}
                cy={toeInAxes.crossPoint.y}
                r={5}
                fill="white"
                stroke={colors.toeInAxis.line}
                strokeWidth={2}
              />
            )}
          </>
        )}

        {/* Lines from listener to speakers (stereo triangle) */}
        {isListenerInRoom && (
          <>
            <line
              x1={listenerPos.x}
              y1={listenerPos.y}
              x2={leftSpeakerPos.x}
              y2={leftSpeakerPos.y}
              stroke={colors.triangle.line}
              strokeWidth={2}
              strokeDasharray="8 4"
              opacity={0.5}
            />
            <line
              x1={listenerPos.x}
              y1={listenerPos.y}
              x2={rightSpeakerPos.x}
              y2={rightSpeakerPos.y}
              stroke={colors.triangle.line}
              strokeWidth={2}
              strokeDasharray="8 4"
              opacity={0.5}
            />
            {/* Base line between speakers */}
            <line
              x1={leftSpeakerPos.x}
              y1={leftSpeakerPos.y}
              x2={rightSpeakerPos.x}
              y2={rightSpeakerPos.y}
              stroke={colors.triangle.line}
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.3}
            />
          </>
        )}

        {/* Standard dimensions */}
        {showDimensions && (
          <>
            {/* Left speaker to left wall - above room */}
            {renderDimension(
              "left-wall-to-speaker",
              roomTopLeft.x,
              roomTopLeft.y - 25,
              leftSpeakerPos.x,
              roomTopLeft.y - 25,
              leftSpeaker.x.toFixed(2),
              true,
            )}

            {/* Right speaker to right wall - above room */}
            {renderDimension(
              "right-speaker-to-wall",
              rightSpeakerPos.x,
              roomTopLeft.y - 25,
              roomBottomRight.x,
              roomTopLeft.y - 25,
              (roomWidth - rightSpeaker.x).toFixed(2),
              true,
            )}

            {/* Speaker to speaker */}
            {renderDimension(
              "speaker-to-speaker",
              leftSpeakerPos.x,
              leftSpeakerPos.y + 35,
              rightSpeakerPos.x,
              leftSpeakerPos.y + 35,
              (rightSpeaker.x - leftSpeaker.x).toFixed(2),
              true,
            )}

            {/* Front wall to speakers (to front baffle) */}
            {renderDimension(
              "front-wall-to-speakers",
              roomTopLeft.x - 30,
              roomTopLeft.y,
              roomTopLeft.x - 30,
              leftSpeakerPos.y + speakerVisualDepth / 2,
              (leftSpeaker.y + speakerDepth / 2).toFixed(2),
              false,
            )}

            {/* Acoustic centre dimension */}
            {showAcousticCentre &&
              renderDimension(
                "front-wall-to-centre",
                roomTopLeft.x - 75,
                roomTopLeft.y,
                roomTopLeft.x - 75,
                leftSpeakerPos.y,
                leftSpeaker.y.toFixed(2),
                false,
                colors.acousticCentre,
                "m",
                true,
              )}

            {/* Front wall to listener */}
            {renderDimension(
              "front-wall-to-listener",
              roomBottomRight.x + 30,
              roomTopLeft.y,
              roomBottomRight.x + 30,
              listenerPos.y,
              listener.y.toFixed(2),
              false,
            )}

            {/* Listener to back wall */}
            {renderDimension(
              "listener-to-back-wall",
              roomBottomRight.x + 30,
              listenerPos.y,
              roomBottomRight.x + 30,
              roomBottomRight.y,
              (roomLength - listener.y).toFixed(2),
              false,
            )}
          </>
        )}

        {showAcousticCentre && (
          <>
            {/* Left speaker centre cross */}
            <line
              x1={leftSpeakerPos.x - 6}
              y1={leftSpeakerPos.y}
              x2={leftSpeakerPos.x + 6}
              y2={leftSpeakerPos.y}
              stroke={colors.acousticCentre.line}
              strokeWidth={2}
            />
            <line
              x1={leftSpeakerPos.x}
              y1={leftSpeakerPos.y - 6}
              x2={leftSpeakerPos.x}
              y2={leftSpeakerPos.y + 6}
              stroke={colors.acousticCentre.line}
              strokeWidth={2}
            />

            {/* Right speaker centre cross */}
            <line
              x1={rightSpeakerPos.x - 6}
              y1={rightSpeakerPos.y}
              x2={rightSpeakerPos.x + 6}
              y2={rightSpeakerPos.y}
              stroke={colors.acousticCentre.line}
              strokeWidth={2}
            />
            <line
              x1={rightSpeakerPos.x}
              y1={rightSpeakerPos.y - 6}
              x2={rightSpeakerPos.x}
              y2={rightSpeakerPos.y + 6}
              stroke={colors.acousticCentre.line}
              strokeWidth={2}
            />
          </>
        )}

        {renderCornerDistanceOverlay()}

        {/* Left speaker - with rotation for toe-in */}
        <g
          onMouseDown={handleMouseDown("left")}
          onTouchStart={handleTouchStart("left")}
          style={{ cursor: "grab" }}
          aria-label="Left speaker (draggable)"
        >
          <rect
            x={leftSpeakerPos.x - speakerVisualWidth / 2}
            y={leftSpeakerPos.y - speakerVisualDepth / 2}
            width={speakerVisualWidth}
            height={speakerVisualDepth}
            fill={colors.speaker.fill}
            stroke={dragging === "left" ? colors.speaker.activeStroke : colors.speaker.stroke}
            strokeWidth={dragging === "left" ? 3 : 2}
            rx={3}
            transform={`rotate(${-toeInAngle}, ${leftSpeakerPos.x}, ${leftSpeakerPos.y})`}
          />
        </g>

        {/* Right speaker - with rotation for toe-in */}
        <g
          onMouseDown={handleMouseDown("right")}
          onTouchStart={handleTouchStart("right")}
          style={{ cursor: lockSymmetry ? "not-allowed" : "grab", opacity: lockSymmetry ? 0.7 : 1 }}
          aria-label="Right speaker (draggable)"
        >
          <rect
            x={rightSpeakerPos.x - speakerVisualWidth / 2}
            y={rightSpeakerPos.y - speakerVisualDepth / 2}
            width={speakerVisualWidth}
            height={speakerVisualDepth}
            fill={colors.speaker.fill}
            stroke={dragging === "right" ? colors.speaker.activeStroke : colors.speaker.stroke}
            strokeWidth={dragging === "right" ? 3 : 2}
            rx={3}
            transform={`rotate(${toeInAngle}, ${rightSpeakerPos.x}, ${rightSpeakerPos.y})`}
          />
        </g>

        {/* Listener */}
        {isListenerInRoom && (
          <g
            style={{ cursor: dragging === "listener" ? "grabbing" : "grab" }}
            onMouseDown={handleMouseDown("listener")}
            onTouchStart={handleTouchStart("listener")}
          >
            <circle
              cx={listenerPos.x}
              cy={listenerPos.y}
              r={listenerRadius}
              fill={colors.listener.fill}
              stroke={dragging === "listener" ? colors.listener.activeStroke : colors.listener.stroke}
              strokeWidth={dragging === "listener" ? 3 : 2}
            />
            <text
              x={listenerPos.x}
              y={listenerPos.y + listenerRadius + 16}
              textAnchor="middle"
              fill="#1e293b"
              fontSize="12"
              fontWeight="600"
              fontFamily="system-ui, sans-serif"
              style={{ pointerEvents: "none" }}
            >
              SÅuchacz
            </text>
            {/* Angle label */}
            <rect
              x={listenerPos.x - 24}
              y={listenerPos.y - listenerRadius - 26}
              width={48}
              height={18}
              fill="white"
              stroke="#bfdbfe"
              strokeWidth={1}
              rx={4}
            />
            <text
              x={listenerPos.x}
              y={listenerPos.y - listenerRadius - 12}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill="#2563eb"
              fontFamily="system-ui, sans-serif"
              style={{ pointerEvents: "none" }}
            >
              {actualAngle.toFixed(1)}Â°
            </text>
          </g>
        )}

        <defs>
          <clipPath id="roomClip">
            <rect
              x={roomTopLeft.x}
              y={roomTopLeft.y}
              width={roomBottomRight.x - roomTopLeft.x}
              height={roomBottomRight.y - roomTopLeft.y}
            />
          </clipPath>
        </defs>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-5 rounded bg-[#1e293b]" />
          <span className="text-muted-foreground">GÅoÅnik</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-[#3b82f6]" />
          <span className="text-muted-foreground">SÅuchacz</span>
        </div>
        {toeInAngle > 0 && (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-0.5"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(90deg, #6366f1 0, #6366f1 6px, transparent 6px, transparent 10px)",
              }}
            />
            <span className="text-muted-foreground">OÅ gÅoÅnika (toe-in)</span>
          </div>
        )}
        {/* Acoustic centre legend entries */}
        {showAcousticCentre && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-[#64748b]" />
              <span className="text-muted-foreground">Front distance</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-0.5"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(90deg, #10b981 0, #10b981 4px, transparent 4px, transparent 7px)",
                }}
              />
              <span className="text-muted-foreground">Centre distance</span>
            </div>
          </>
        )}
        {showAcousticTreatment && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#f97316]" />
              <span className="text-muted-foreground">Panel</span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6 50%, transparent 50%)",
                }}
              />
              <span className="text-muted-foreground">Bass trap</span>
            </div>
          </>
        )}
        {showCornerDistances && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#7c3aed]" />
            <span className="text-muted-foreground">RÃ³g â Åciana frontowa</span>
          </div>
        )}
      </div>
    </div>
  )
}
