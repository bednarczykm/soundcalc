"use client"

import type React from "react"

import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Copy,
  Ruler,
  Save,
  Trash2,
  FolderOpen,
  HardDrive,
  FileDown,
  FileUp,
  Info,
} from "lucide-react"
import { RoomDiagram } from "@/components/room-diagram"
import { AcousticPanelTable } from "@/components/acoustic-panel-table"
import { GeometrySummary } from "@/components/geometry-summary"
import {
  SpeakerCornerDistances,
  calculateSpeakerCorners,
  calculateCornerDistancesToFrontWall,
} from "@/components/speaker-corner-distances"
import { CornerDistancesTable } from "@/components/corner-distances-table"
import { Slider } from "@/components/ui/slider"

export interface AcousticPanel {
  type: "side" | "back" | "front" | "bass-trap"
  wall: "left" | "right" | "back" | "front" | "corner"
  centerX: number
  centerY: number
  width: number
  height: number
}

export interface SpeakerPosition {
  x: number
  y: number
}

export interface ListenerPosition {
  x: number
  y: number
}

interface SavedSetup {
  id: string
  name: string
  timestamp: number
  data: {
    roomWidth: number
    roomLength: number
    speakerWidth: number
    speakerDepth: number
    leftSpeaker: SpeakerPosition
    rightSpeaker: SpeakerPosition
    listenerPos: ListenerPosition
    targetAngle: number
    minBackWallDistance: number
  }
}

const STORAGE_KEY = "stereo-calculator-setups"

export default function StereoCalculator() {
  // Room dimensions
  const [roomWidth, setRoomWidth] = useState(3.8)
  const [roomLength, setRoomLength] = useState(4.2)

  // Speaker physical size
  const [speakerWidth, setSpeakerWidth] = useState(0.77)
  const [speakerDepth, setSpeakerDepth] = useState(0.55)

  // Speaker and listener positions (direct state for drag)
  const [leftSpeaker, setLeftSpeaker] = useState<SpeakerPosition>({ x: 0.8, y: 0.9 })
  const [rightSpeaker, setRightSpeaker] = useState<SpeakerPosition>({ x: 3.0, y: 0.9 })
  const [listenerPos, setListenerPos] = useState<ListenerPosition>({ x: 1.9, y: 2.7 })

  // Settings
  const [targetAngle, setTargetAngle] = useState(60)
  const [minBackWallDistance, setMinBackWallDistance] = useState(0.8)

  // Interaction options
  const [lockSymmetry, setLockSymmetry] = useState(true)
  const [lockListeningAngle, setLockListeningAngle] = useState(true)

  const [toeInAngle, setToeInAngle] = useState(15) // degrees, per speaker side
  const [lockToeSymmetry, setLockToeSymmetry] = useState(true)

  const [showDimensions, setShowDimensions] = useState(false)
  const [showAcousticTreatment, setShowAcousticTreatment] = useState(false)
  const [showAcousticCentre, setShowAcousticCentre] = useState(false)
  const [showCornerDistances, setShowCornerDistances] = useState(false)

  const activePreset = useState<"golden" | "thirds" | null>(null)
  const savedPositions = useRef<{
    leftSpeaker: SpeakerPosition
    rightSpeaker: SpeakerPosition
    listenerPos: ListenerPosition
  } | null>(null)

  // State for saved setups
  const [savedSetups, setSavedSetups] = useState<SavedSetup[]>([])
  const [currentSetupName, setCurrentSetupName] = useState("")
  const [activeSetupId, setActiveSetupId] = useState<string | null>(null)
  const [exportSetupId, setExportSetupId] = useState<string>("")

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSavedSetups(JSON.parse(stored))
      } catch (e) {
        console.error("Failed to load saved setups:", e)
      }
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedSetups))
  }, [savedSetups])

  const cornerDistances = useMemo(() => {
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

    return {
      left: calculateCornerDistancesToFrontWall(leftCorners),
      right: calculateCornerDistancesToFrontWall(rightCorners),
    }
  }, [leftSpeaker, rightSpeaker, speakerWidth, speakerDepth, toeInAngle])

  // Derived values: compute speaker distances from walls (for input sync)
  const sideWallDistance = leftSpeaker.x
  // Front baffle position = leftSpeaker.y + speakerDepth/2
  const frontWallDistance = leftSpeaker.y + speakerDepth / 2

  // Calculate listener position for a given angle
  const calculateListenerForAngle = useCallback(
    (speakerSpacing: number, speakerY: number, angle: number, roomW: number) => {
      const A_rad = (angle * Math.PI) / 180
      const Y_offset = speakerSpacing / 2 / Math.tan(A_rad / 2)
      return {
        x: roomW / 2,
        y: speakerY + Y_offset,
      }
    },
    [],
  )

  // Handler for updating speaker distance from side wall (numeric input)
  // Local state for side wall input text (mirrors front wall pattern)
  const [sideWallInputText, setSideWallInputText] = useState(sideWallDistance.toFixed(2))
  const [isEditingSideWall, setIsEditingSideWall] = useState(false)

  useEffect(() => {
    if (!isEditingSideWall) {
      setSideWallInputText(sideWallDistance.toFixed(2))
    }
  }, [sideWallDistance, isEditingSideWall])

  const handleSideWallDistanceChange = (inputValue: string) => {
    setSideWallInputText(inputValue)

    const normalizedValue = inputValue.replace(",", ".")
    const value = Number.parseFloat(normalizedValue)

    if (isNaN(value)) return

    const minSide = 0.1
    const maxSide = roomWidth / 2 - 0.1
    if (value < minSide || value > maxSide) return

    setLeftSpeaker((prev) => ({ ...prev, x: value }))
    if (lockSymmetry) {
      setRightSpeaker((prev) => ({ ...prev, x: roomWidth - value }))
    }

    if (lockListeningAngle) {
      const newSpacing = roomWidth - 2 * value
      const newListener = calculateListenerForAngle(newSpacing, leftSpeaker.y, targetAngle, roomWidth)
      if (newListener.y > 0 && newListener.y < roomLength) {
        setListenerPos(newListener)
      }
    }
  }

  // Local state for front wall input text
  const [frontWallInputText, setFrontWallInputText] = useState(frontWallDistance.toFixed(2))
  const [isEditingFrontWall, setIsEditingFrontWall] = useState(false)

  useEffect(() => {
    if (!isEditingFrontWall) {
      setFrontWallInputText(frontWallDistance.toFixed(2))
    }
  }, [frontWallDistance, isEditingFrontWall])

  // Handler for updating speaker distance from front wall (numeric input)
  const handleFrontWallDistanceChange = (inputValue: string) => {
    setFrontWallInputText(inputValue)

    // Replace comma with period for parsing
    const normalizedValue = inputValue.replace(",", ".")
    const value = Number.parseFloat(normalizedValue)

    if (isNaN(value)) return

    const minFront = 0.05 // front baffle at least 5cm from wall
    const maxFront = roomLength - speakerDepth - 0.5
    // Reject out-of-range values silently — user may still be typing.
    if (value < minFront || value > maxFront) return

    const centerY = value - speakerDepth / 2

    setLeftSpeaker((prev) => ({ ...prev, y: centerY }))
    setRightSpeaker((prev) => ({ ...prev, y: centerY }))

    if (lockListeningAngle) {
      const spacing = rightSpeaker.x - leftSpeaker.x
      const newListener = calculateListenerForAngle(spacing, centerY, targetAngle, roomWidth)
      if (newListener.y > 0 && newListener.y < roomLength) {
        setListenerPos(newListener)
      }
    }
  }

  // Handler for drag operations
  const handleDrag = useCallback(
    (element: "left" | "right" | "listener", newX: number, newY: number) => {
      // Clamp to room bounds
      const clampedX = Math.max(0.1, Math.min(newX, roomWidth - 0.1))
      const clampedY = Math.max(0.1, Math.min(newY, roomLength - 0.1))

      if (element === "listener") {
        if (lockListeningAngle) {
          // Keep listener centered horizontally and only move along the listening axis
          // Calculate the required Y position to maintain the target angle
          const spacing = rightSpeaker.x - leftSpeaker.x
          const speakerCenterX = (leftSpeaker.x + rightSpeaker.x) / 2

          // Only allow Y movement - listener stays centered
          const newListener = calculateListenerForAngle(spacing, leftSpeaker.y, targetAngle, roomWidth)
          if (newListener.y > 0 && newListener.y < roomLength) {
            // Allow only Y-axis movement while maintaining angle
            setListenerPos({ x: speakerCenterX, y: clampedY })
            // Recalculate speakers to maintain the angle with new listener Y
            const halfAngleRad = (targetAngle / 2) * (Math.PI / 180)
            const distanceFromSpeakers = clampedY - leftSpeaker.y
            if (distanceFromSpeakers > 0) {
              const requiredHalfSpacing = distanceFromSpeakers * Math.tan(halfAngleRad)
              const newLeftX = Math.max(0.1, speakerCenterX - requiredHalfSpacing)
              const newRightX = Math.min(roomWidth - 0.1, speakerCenterX + requiredHalfSpacing)
              setLeftSpeaker((prev) => ({ ...prev, x: newLeftX }))
              setRightSpeaker((prev) => ({ ...prev, x: newRightX }))
            }
          }
        } else {
          setListenerPos({ x: clampedX, y: clampedY })
        }
      } else if (element === "left") {
        const speakerClampedX = Math.max(0.1, Math.min(clampedX, roomWidth / 2 - 0.1))
        setLeftSpeaker({ x: speakerClampedX, y: clampedY })

        if (lockSymmetry) {
          setRightSpeaker({ x: roomWidth - speakerClampedX, y: clampedY })
        }

        if (lockListeningAngle) {
          const newSpacing = lockSymmetry ? roomWidth - 2 * speakerClampedX : rightSpeaker.x - speakerClampedX
          const newListener = calculateListenerForAngle(newSpacing, clampedY, targetAngle, roomWidth)
          if (newListener.y > 0 && newListener.y < roomLength) {
            setListenerPos(newListener)
          }
        }
      } else if (element === "right" && !lockSymmetry) {
        const speakerClampedX = Math.max(roomWidth / 2 + 0.1, Math.min(clampedX, roomWidth - 0.1))
        setRightSpeaker({ x: speakerClampedX, y: clampedY })

        if (lockListeningAngle) {
          const newSpacing = speakerClampedX - leftSpeaker.x
          const newListener = calculateListenerForAngle(newSpacing, clampedY, targetAngle, roomWidth)
          if (newListener.y > 0 && newListener.y < roomLength) {
            setListenerPos(newListener)
          }
        }
      }
    },
    [
      roomWidth,
      roomLength,
      lockSymmetry,
      lockListeningAngle,
      targetAngle,
      calculateListenerForAngle,
      leftSpeaker.x,
      rightSpeaker.x,
    ],
  )

  // Calculations
  const calculations = useMemo(() => {
    const W = roomWidth
    const L = roomLength

    // Speaker spacing (centre-to-centre)
    const S = rightSpeaker.x - leftSpeaker.x

    // Edge-to-edge spacing
    const edgeToEdge = S - speakerWidth

    // Distance from back wall
    const distToBack = L - listenerPos.y

    // Distance listener-speaker
    const D = Math.sqrt(Math.pow(listenerPos.x - leftSpeaker.x, 2) + Math.pow(listenerPos.y - leftSpeaker.y, 2))

    // Actual angle
    const actualAngle_rad = 2 * Math.atan(S / 2 / Math.max(0.01, listenerPos.y - leftSpeaker.y))
    const actualAngle_deg = (actualAngle_rad * 180) / Math.PI

    // Edge distances
    const leftEdgeToWall = leftSpeaker.x - speakerWidth / 2
    const rightEdgeToWall = W - rightSpeaker.x - speakerWidth / 2

    return {
      speakerSpacing: S,
      speakerEdgeToEdge: edgeToEdge,
      listenerFromFront: listenerPos.y,
      listenerFromBack: distToBack,
      listenerSpeakerDistance: D,
      actualAngle: actualAngle_deg,
      leftSpeaker,
      rightSpeaker,
      listener: listenerPos,
      roomWidth: W,
      roomLength: L,
      leftEdgeToWall,
      rightEdgeToWall,
      speakerFrontToWall: leftSpeaker.y - speakerDepth / 2,
    }
  }, [roomWidth, roomLength, leftSpeaker, rightSpeaker, listenerPos, speakerWidth, speakerDepth])

  // Acoustic panels
  const acousticPanels = useMemo(() => {
    const panels: AcousticPanel[] = []
    const W = calculations.roomWidth
    const L = calculations.roomLength
    const { leftSpeaker: ls, rightSpeaker: rs, listener } = calculations

    // Side wall first-reflection panels using mirror method
    const mirroredLeftX = -ls.x
    const mirroredLeftY = ls.y
    const dxLeft = mirroredLeftX - listener.x
    const dyLeft = mirroredLeftY - listener.y
    const tLeft = -listener.x / dxLeft
    const yRefLeft = listener.y + tLeft * dyLeft

    if (yRefLeft >= 0 && yRefLeft <= L) {
      panels.push({
        type: "side",
        wall: "left",
        centerX: 0,
        centerY: yRefLeft,
        width: 1.0,
        height: 0.6,
      })
    }

    const mirroredRightX = 2 * W - rs.x
    const mirroredRightY = rs.y
    const dxRight = mirroredRightX - listener.x
    const dyRight = mirroredRightY - listener.y
    const tRight = (W - listener.x) / dxRight
    const yRefRight = listener.y + tRight * dyRight

    if (yRefRight >= 0 && yRefRight <= L) {
      panels.push({
        type: "side",
        wall: "right",
        centerX: W,
        centerY: yRefRight,
        width: 1.0,
        height: 0.6,
      })
    }

    // Back panel
    panels.push({
      type: "back",
      wall: "back",
      centerX: W / 2,
      centerY: L,
      width: Math.min(W * 0.8, 2.0),
      height: 1.2,
    })

    // Front panels
    if (ls.y > 0.15) {
      panels.push({
        type: "front",
        wall: "front",
        centerX: ls.x,
        centerY: 0,
        width: 0.6,
        height: 1.2,
      })
      panels.push({
        type: "front",
        wall: "front",
        centerX: rs.x,
        centerY: 0,
        width: 0.6,
        height: 1.2,
      })
    }

    // Bass traps
    const corners = [
      { x: 0, y: 0 },
      { x: W, y: 0 },
      { x: 0, y: L },
      { x: W, y: L },
    ]
    corners.forEach((corner) => {
      panels.push({
        type: "bass-trap",
        wall: "corner",
        centerX: corner.x,
        centerY: corner.y,
        width: 0,
        height: 0,
      })
    })

    return panels
  }, [calculations])

  const isTooCloseToBack = calculations.listenerFromBack < minBackWallDistance
  const isSpeakerTooCloseToWall = calculations.leftEdgeToWall < 0.2 || calculations.rightEdgeToWall < 0.2

  const handleRoomWidthChange = (value: number) => {
    // Reject out-of-range values silently — user may still be typing.
    if (value < 1.0 || value > 20.0) return
    setRoomWidth(value)

    // Adjust positions if they're now outside the room
    if (leftSpeaker.x > value / 2) {
      setLeftSpeaker((prev) => ({ ...prev, x: value * 0.2 }))
    }
    if (rightSpeaker.x > value) {
      setRightSpeaker((prev) => ({ ...prev, x: value * 0.8 }))
    }
    if (listenerPos.x > value) {
      setListenerPos((prev) => ({ ...prev, x: value / 2 }))
    }
  }

  const handleRoomLengthChange = (value: number) => {
    // Reject out-of-range values silently — user may still be typing.
    if (value < 1.0 || value > 20.0) return
    setRoomLength(value)

    // Adjust positions if they're now outside the room
    if (leftSpeaker.y > value) {
      setLeftSpeaker((prev) => ({ ...prev, y: value * 0.2 }))
    }
    if (rightSpeaker.y > value) {
      setRightSpeaker((prev) => ({ ...prev, y: value * 0.2 }))
    }
    if (listenerPos.y > value) {
      setListenerPos((prev) => ({ ...prev, y: value * 0.6 }))
    }
  }

  const toggleGoldenRatio = () => {
    if (activePreset[0] === "golden") {
      // Turn off - restore saved positions
      if (savedPositions.current) {
        setLeftSpeaker(savedPositions.current.leftSpeaker)
        setRightSpeaker(savedPositions.current.rightSpeaker)
        setListenerPos(savedPositions.current.listenerPos)
      }
      activePreset[1]("golden", null)
    } else {
      // Turn on - save current positions and apply preset
      savedPositions.current = {
        leftSpeaker: { ...leftSpeaker },
        rightSpeaker: { ...rightSpeaker },
        listenerPos: { ...listenerPos },
      }

      const listenerY = roomLength * 0.62
      const speakerY = roomLength * 0.21
      const sideDistance = roomWidth * 0.38

      setLeftSpeaker({ x: sideDistance, y: speakerY })
      setRightSpeaker({ x: roomWidth - sideDistance, y: speakerY })
      setListenerPos({ x: roomWidth / 2, y: listenerY })
      activePreset[1]("golden", "golden")
    }
  }

  const toggleThirdRule = () => {
    if (activePreset[0] === "thirds") {
      // Turn off - restore saved positions
      if (savedPositions.current) {
        setLeftSpeaker(savedPositions.current.leftSpeaker)
        setRightSpeaker(savedPositions.current.rightSpeaker)
        setListenerPos(savedPositions.current.listenerPos)
      }
      activePreset[1](null, null)
    } else {
      // Turn on - save current positions and apply preset
      savedPositions.current = {
        leftSpeaker: { ...leftSpeaker },
        rightSpeaker: { ...rightSpeaker },
        listenerPos: { ...listenerPos },
      }

      const newSpeakerY = roomLength / 3
      const newListenerY = (roomLength * 2) / 3
      const newSideDistance = roomWidth / 3

      setLeftSpeaker({ x: newSideDistance, y: newSpeakerY })
      setRightSpeaker({ x: roomWidth - newSideDistance, y: newSpeakerY })
      setListenerPos({ x: roomWidth / 2, y: newListenerY })
      activePreset[1]("thirds", "thirds")
    }
  }

  const resetToDefaults = () => {
    const defaultRoomWidth = 3.8
    const defaultRoomLength = 4.2

    // Reset room dimensions
    setRoomWidth(defaultRoomWidth)
    setRoomLength(defaultRoomLength)

    // Reset speaker size
    setSpeakerWidth(0.3)
    setSpeakerDepth(0.4)

    // Reset settings
    setTargetAngle(60)
    setMinBackWallDistance(0.8)

    // Reset interaction options
    setLockSymmetry(true)
    setLockListeningAngle(true)

    setToeInAngle(15)
    setLockToeSymmetry(true)

    // Reset view options - turn off all overlays
    setShowDimensions(false)
    setShowAcousticTreatment(false)
    setShowAcousticCentre(false)
    setShowCornerDistances(false)

    activePreset[1](null, null)
    savedPositions.current = null

    // Reset positions based on default room dimensions
    const defaultSideDistance = 0.8
    setLeftSpeaker({ x: defaultSideDistance, y: 0.9 })
    setRightSpeaker({ x: defaultRoomWidth - defaultSideDistance, y: 0.9 })
    setListenerPos({ x: defaultRoomWidth / 2, y: 2.7 })
  }

  const copySetupToClipboard = () => {
    const setup = {
      room: { width: roomWidth, length: roomLength },
      speakers: {
        left: { x: leftSpeaker.x, y: leftSpeaker.y },
        right: { x: rightSpeaker.x, y: rightSpeaker.y },
        size: { width: speakerWidth, depth: speakerDepth },
      },
      listener: { x: listenerPos.x, y: listenerPos.y },
    }
    navigator.clipboard.writeText(JSON.stringify(setup, null, 2))
  }

  // Function to save current setup
  const saveCurrentSetup = () => {
    const name = currentSetupName.trim() || `Setup ${new Date().toLocaleString("pl-PL")}`
    const newSetup: SavedSetup = {
      id: Date.now().toString(),
      name,
      timestamp: Date.now(),
      data: {
        roomWidth,
        roomLength,
        speakerWidth,
        speakerDepth,
        leftSpeaker: { ...leftSpeaker },
        rightSpeaker: { ...rightSpeaker },
        listenerPos: { ...listenerPos },
        targetAngle,
        minBackWallDistance,
      },
    }
    setSavedSetups((prev) => [...prev, newSetup])
    setCurrentSetupName("")
  }

  // Function to load a saved setup
  const loadSetup = (setup: SavedSetup) => {
    setRoomWidth(setup.data.roomWidth)
    setRoomLength(setup.data.roomLength)
    setSpeakerWidth(setup.data.speakerWidth)
    setSpeakerDepth(setup.data.speakerDepth)
    setLeftSpeaker(setup.data.leftSpeaker)
    setRightSpeaker(setup.data.rightSpeaker)
    setListenerPos(setup.data.listenerPos)
    setTargetAngle(setup.data.targetAngle)
    setMinBackWallDistance(setup.data.minBackWallDistance)
    activePreset[1](null, null)
    savedPositions.current = null
    setActiveSetupId(setup.id)
  }

  // Function to delete a saved setup
  const deleteSetup = (id: string) => {
    setSavedSetups((prev) => prev.filter((s) => s.id !== id))
    if (activeSetupId === id) {
      setActiveSetupId(null)
    }
  }

  const exportSetups = () => {
    const dataToExport = {
      version: 1,
      exportDate: new Date().toISOString(),
      setups: savedSetups,
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stereo-calculator-setups-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportSingleSetup = (setup: SavedSetup) => {
    const dataToExport = {
      version: 1,
      exportDate: new Date().toISOString(),
      setups: [setup],
    }
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    // Sanitize filename - replace invalid characters
    const sanitizedName = setup.name.replace(/[^a-zA-Z0-9ąćęłńóśźżĄĆĘŁŃÓŚŹŻ\s\-_]/g, "").replace(/\s+/g, "-")
    const a = document.createElement("a")
    a.download = `${sanitizedName}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const importSetups = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsed = JSON.parse(content)

        // Handle both old format (array) and new format (object with setups array)
        let importedSetups: SavedSetup[] = []
        if (Array.isArray(parsed)) {
          importedSetups = parsed
        } else if (parsed.setups && Array.isArray(parsed.setups)) {
          importedSetups = parsed.setups
        } else {
          throw new Error("Nieprawidłowy format pliku")
        }

        // Validate and merge setups (avoid duplicates by id)
        const existingIds = new Set(savedSetups.map((s) => s.id))
        const newSetups = importedSetups.filter((s) => !existingIds.has(s.id))

        if (newSetups.length > 0) {
          setSavedSetups((prev) => [...prev, ...newSetups])
          alert(`Zaimportowano ${newSetups.length} nowych ustawień.`)
        } else if (importedSetups.length > 0) {
          alert("Wszystkie ustawienia z pliku już istnieją.")
        } else {
          alert("Plik nie zawiera żadnych ustawień.")
        }
      } catch (err) {
        console.error("Failed to import setups:", err)
        alert("Błąd importu: nieprawidłowy format pliku.")
      }
    }
    reader.readAsText(file)
    // Reset input so the same file can be imported again
    event.target.value = ""
  }

  const toeInInfo = useMemo(() => {
    if (toeInAngle === 0) {
      return { status: "straight" as const, message: "Głośniki skierowane prosto (0° toe-in)" }
    }

    const theta = (toeInAngle * Math.PI) / 180

    // Direction vectors for each speaker
    const dirL = { dx: Math.sin(theta), dy: Math.cos(theta) }
    const dirR = { dx: -Math.sin(theta), dy: Math.cos(theta) }

    // Speaker positions
    const xL = leftSpeaker.x
    const xR = rightSpeaker.x
    const yS = leftSpeaker.y

    // Find intersection of two lines:
    // Left: P(t) = (xL + t*dirL.dx, yS + t*dirL.dy)
    // Right: Q(u) = (xR + u*dirR.dx, yS + u*dirR.dy)
    // Solve: xL + t*dirL.dx = xR + u*dirR.dx
    //        yS + t*dirL.dy = yS + u*dirR.dy

    // From second equation: t*dirL.dy = u*dirR.dy => t = u (since dirL.dy = dirR.dy = cos(theta))
    // Substitute into first: xL + t*sin(theta) = xR - t*sin(theta)
    // => 2*t*sin(theta) = xR - xL
    // => t = (xR - xL) / (2 * sin(theta))

    const t = (xR - xL) / (2 * Math.sin(theta))
    const yCross = yS + t * Math.cos(theta)
    const yListener = listenerPos.y

    const diff = yCross - yListener

    if (diff < -0.2) {
      return {
        status: "inFront" as const,
        crossY: yCross,
        message: `Osie krzyżują się PRZED słuchaczem (~${yCross.toFixed(2)} m od frontu)`,
      }
    } else if (diff > 0.2) {
      return {
        status: "behind" as const,
        crossY: yCross,
        message: `Osie krzyżują się ZA słuchaczem (~${yCross.toFixed(2)} m od frontu)`,
      }
    } else {
      return {
        status: "atListener" as const,
        crossY: yCross,
        message: `Osie krzyżują się NA słuchaczu (pełny on-axis)`,
      }
    }
  }, [toeInAngle, leftSpeaker, rightSpeaker, listenerPos])

  const toeInQualityHint = useMemo(() => {
    if (toeInAngle === 0) {
      return { type: "info" as const, message: "Głośniki skierowane prosto (0° toe-in)" }
    }
    if (toeInAngle >= 10 && toeInAngle <= 25 && (toeInInfo.status === "behind" || toeInInfo.status === "atListener")) {
      return {
        type: "success" as const,
        message: `Toe-in OK (${toeInAngle}°${toeInInfo.crossY ? `, osie ~${toeInInfo.crossY.toFixed(2)} m` : ""})`,
      }
    }
    if (toeInAngle > 30) {
      return { type: "warning" as const, message: "Silny toe-in – może zawęzić scenę dźwiękową" }
    }
    return { type: "info" as const, message: `Toe-in: ${toeInAngle}°` }
  }, [toeInAngle, toeInInfo])

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mb-6 text-center text-3xl font-bold text-foreground">Kalkulator ustawień stereo</h1>

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left Panel - Inputs */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Ustawienia pokoju i głośników</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Room dimensions */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="roomWidth">Szerokość pokoju (m)</Label>
                <Input
                  id="roomWidth"
                  type="number"
                  step="0.01"
                  min="1"
                  max="20"
                  value={roomWidth}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value)
                    if (!isNaN(v)) handleRoomWidthChange(v)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roomLength">Długość pokoju (m)</Label>
                <Input
                  id="roomLength"
                  type="number"
                  step="0.01"
                  min="1"
                  max="20"
                  value={roomLength}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value)
                    if (!isNaN(v)) handleRoomLengthChange(v)
                  }}
                />
              </div>
            </div>

            {/* Speaker physical size */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="speakerWidth">Szerokość głośnika (m)</Label>
                <Input
                  id="speakerWidth"
                  type="number"
                  step="0.01"
                  value={speakerWidth}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value)
                    if (!isNaN(v) && v > 0) setSpeakerWidth(v)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="speakerDepth">Głębokość głośnika (m)</Label>
                <Input
                  id="speakerDepth"
                  type="number"
                  step="0.01"
                  value={speakerDepth}
                  onChange={(e) => {
                    const v = Number.parseFloat(e.target.value)
                    if (!isNaN(v) && v > 0) setSpeakerDepth(v)
                  }}
                />
              </div>
            </div>

            {/* Speaker positions */}
            <div className="space-y-2">
              <Label htmlFor="sideWall">Odległość głośnika od ściany bocznej (m)</Label>
              <Input
                id="sideWall"
                type="text"
                inputMode="decimal"
                value={sideWallInputText}
                onChange={(e) => {
                  setIsEditingSideWall(true)
                  handleSideWallDistanceChange(e.target.value)
                }}
                onBlur={() => setIsEditingSideWall(false)}
              />
              <p className="text-xs text-muted-foreground">Odległość od ściany bocznej do środka głośnika</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frontWall">Odległość głośnika od ściany frontowej (do przedniej płyty) (m)</Label>
              <Input
                id="frontWall"
                type="text"
                inputMode="decimal"
                value={frontWallInputText}
                onChange={(e) => {
                  setIsEditingFrontWall(true)
                  handleFrontWallDistanceChange(e.target.value)
                }}
                onBlur={() => setIsEditingFrontWall(false)}
              />
              <p className="text-xs text-muted-foreground">Odległość od ściany frontowej do przedniej płyty głośnika</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAngle">Docelowy kąt odsłuchu (°)</Label>
              <Input
                id="targetAngle"
                type="number"
                step="1"
                value={targetAngle}
                onChange={(e) => {
                  const newAngle = Number.parseFloat(e.target.value)
                  if (isNaN(newAngle)) return
                  setTargetAngle(newAngle)
                  if (lockListeningAngle) {
                    const spacing = rightSpeaker.x - leftSpeaker.x
                    const newListener = calculateListenerForAngle(spacing, leftSpeaker.y, newAngle, roomWidth)
                    if (newListener.y > 0 && newListener.y < roomLength) {
                      setListenerPos(newListener)
                    }
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minBack">Min. odległość od ściany tylnej (m)</Label>
              <Input
                id="minBack"
                type="number"
                step="0.01"
                value={minBackWallDistance}
                onChange={(e) => {
                  const v = Number.parseFloat(e.target.value)
                  if (!isNaN(v)) setMinBackWallDistance(v)
                }}
              />
            </div>

            {/* Save / Load Setup section */}
            <div className="space-y-4 rounded-lg border p-4">
              {/* Section 1: Save current setup */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Zapisz bieżący setup
                </p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nazwa setupu..."
                    value={currentSetupName}
                    onChange={(e) => setCurrentSetupName(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={saveCurrentSetup}>Zapisz</Button>
                </div>
              </div>

              {/* Section 2: Saved setups list */}
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="h-4 w-4" />
                  Zapisane setupy ({savedSetups.length})
                </p>
                {savedSetups.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">Brak zapisanych setupów</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {savedSetups.map((setup) => (
                      <div
                        key={setup.id}
                        className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                          activeSetupId === setup.id
                            ? "border-l-4 border-l-primary bg-primary/5"
                            : "border-l-4 border-l-transparent hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm leading-tight">{setup.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(setup.timestamp).toLocaleDateString("pl-PL")}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant={activeSetupId === setup.id ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => loadSetup(setup)}
                            className="text-xs h-7 px-2"
                          >
                            {activeSetupId === setup.id ? "Aktywny" : "Załaduj"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSetup(setup.id)}
                            title="Usuń"
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 3: File operations */}
              <div className="space-y-2 border-t pt-4">
                <p className="text-sm font-medium flex items-center gap-2">
                  <HardDrive className="h-4 w-4" />
                  Plik
                </p>
                <div className="flex gap-2">
                  {/* Export dropdown + button */}
                  <div className="flex-1 flex gap-1">
                    <select
                      value={exportSetupId}
                      onChange={(e) => setExportSetupId(e.target.value)}
                      className="flex-1 h-9 rounded-md border border-input bg-background px-2 text-sm"
                      disabled={savedSetups.length === 0}
                    >
                      <option value="">Wybierz setup...</option>
                      {savedSetups.map((setup) => (
                        <option key={setup.id} value={setup.id}>
                          {setup.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const setup = savedSetups.find((s) => s.id === exportSetupId)
                        if (setup) exportSingleSetup(setup)
                      }}
                      disabled={!exportSetupId}
                      title="Pobierz wybrany setup"
                      className="h-9"
                    >
                      <FileDown className="h-4 w-4" />
                    </Button>
                  </div>
                  {/* Import button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("import-setups-input")?.click()}
                    title="Wgraj setup z pliku"
                    className="h-9"
                  >
                    <FileUp className="h-4 w-4 mr-1" />
                    Wgraj
                  </Button>
                  <input
                    id="import-setups-input"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={importSetups}
                  />
                </div>
              </div>
            </div>

            {/* Interaction options */}
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Opcje interakcji</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="lockSymmetry" className="text-sm">
                  Blokuj symetrię
                </Label>
                <Switch id="lockSymmetry" checked={lockSymmetry} onCheckedChange={setLockSymmetry} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="lockAngle" className="text-sm">
                  Blokuj kąt odsłuchu
                </Label>
                <Switch id="lockAngle" checked={lockListeningAngle} onCheckedChange={setLockListeningAngle} />
              </div>

              <div className="border-t pt-3 mt-3 space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="toeInAngle" className="text-sm">
                      Kąt toe-in (na głośnik)
                    </Label>
                    <span className="text-sm font-medium">{toeInAngle}°</span>
                  </div>
                  <Slider
                    id="toeInAngle"
                    min={0}
                    max={45}
                    step={1}
                    value={[toeInAngle]}
                    onValueChange={(value) => setToeInAngle(value[0])}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    0° = prosto, 15–25° = typowy toe-in, 30–45° = silny toe-in
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="lockToeSymmetry" className="text-sm">
                    Blokuj symetrię toe-in
                  </Label>
                  <Switch id="lockToeSymmetry" checked={lockToeSymmetry} onCheckedChange={setLockToeSymmetry} />
                </div>
              </div>
            </div>

            {/* View options */}
            <div className="space-y-3 rounded-lg border p-4">
              <p className="text-sm font-medium">Opcje widoku</p>
              <div className="flex items-center justify-between">
                <Label htmlFor="showDimensions" className="text-sm">
                  Pokaż wymiary
                </Label>
                <Switch id="showDimensions" checked={showDimensions} onCheckedChange={setShowDimensions} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="acousticTreatment" className="text-sm">
                  Pokaż adaptację akustyczną
                </Label>
                <Switch
                  id="acousticTreatment"
                  checked={showAcousticTreatment}
                  onCheckedChange={setShowAcousticTreatment}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showAcousticCentre" className="text-sm">
                  Pokaż środek akustyczny
                </Label>
                <Switch id="showAcousticCentre" checked={showAcousticCentre} onCheckedChange={setShowAcousticCentre} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="showCornerDistances" className="text-sm">
                  Rogi → ściana frontowa
                </Label>
                <Switch
                  id="showCornerDistances"
                  checked={showCornerDistances}
                  onCheckedChange={setShowCornerDistances}
                />
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Presety</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activePreset[0] === "golden" ? "default" : "outline"}
                  size="sm"
                  onClick={toggleGoldenRatio}
                >
                  <Ruler className="mr-1 h-4 w-4" />
                  Złoty podział
                </Button>
                <Button
                  variant={activePreset[0] === "thirds" ? "default" : "outline"}
                  size="sm"
                  onClick={toggleThirdRule}
                >
                  Reguła 1/3
                </Button>
              </div>
              {activePreset[0] && (
                <p className="text-xs text-muted-foreground">Kliknij ponownie, aby przywrócić poprzednie pozycje</p>
              )}
            </div>

            {/* Presets and actions */}
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                <RotateCcw className="mr-1 h-4 w-4" />
                Resetuj
              </Button>
              <Button variant="outline" size="sm" onClick={copySetupToClipboard}>
                <Copy className="mr-1 h-4 w-4" />
                Kopiuj JSON
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Middle Panel - Diagram */}
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle>Diagram pokoju (widok z góry)</CardTitle>
            <p className="text-sm text-muted-foreground">Przeciągnij głośniki i słuchacza, aby dostosować pozycje</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <RoomDiagram
                roomWidth={roomWidth}
                roomLength={roomLength}
                leftSpeaker={calculations.leftSpeaker}
                rightSpeaker={calculations.rightSpeaker}
                listener={calculations.listener}
                actualAngle={calculations.actualAngle}
                speakerWidth={speakerWidth}
                speakerDepth={speakerDepth}
                showAcousticTreatment={showAcousticTreatment}
                showDimensions={showDimensions}
                showAcousticCentre={showAcousticCentre}
                showCornerDistances={showCornerDistances}
                acousticPanels={acousticPanels}
                onDrag={handleDrag}
                lockSymmetry={lockSymmetry}
                toeInAngle={toeInAngle}
                lockToeSymmetry={lockToeSymmetry}
              />
              {showCornerDistances && (
                <CornerDistancesTable leftDistances={cornerDistances.left} rightDistances={cornerDistances.right} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right Panel - Results */}
        <div className="space-y-6 xl:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Wyniki obliczeń</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <ResultItem label="Rozstaw głośników (środek–środek)" value={calculations.speakerSpacing} unit="m" />
                <ResultItem label="Rozstaw głośników (krawędź–krawędź)" value={calculations.speakerEdgeToEdge} unit="m" />
                <ResultItem label="Słuchacz od frontu" value={calculations.listenerFromFront} unit="m" />
                <ResultItem
                  label="Słuchacz od tyłu"
                  value={calculations.listenerFromBack}
                  unit="m"
                  highlight={isTooCloseToBack}
                />
                <ResultItem label="Odległość słuchacz–głośnik" value={calculations.listenerSpeakerDistance} unit="m" />
                <ResultItem label="Rzeczywisty kąt" value={calculations.actualAngle} unit="°" />
              </div>

              {isTooCloseToBack ? (
                <Alert variant="destructive" className="mt-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Słuchacz zbyt blisko ściany tylnej ({calculations.listenerFromBack.toFixed(2)} m).
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="mt-4 border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Pozycja OK ({calculations.listenerFromBack.toFixed(2)} m od ściany tylnej).
                  </AlertDescription>
                </Alert>
              )}

              {toeInQualityHint.type === "success" && (
                <Alert className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{toeInQualityHint.message}</AlertDescription>
                </Alert>
              )}
              {toeInQualityHint.type === "warning" && (
                <Alert className="border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{toeInQualityHint.message}</AlertDescription>
                </Alert>
              )}
              {toeInQualityHint.type === "info" && (
                <Alert className="border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Info className="h-4 w-4" />
                  <AlertDescription>{toeInQualityHint.message}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <GeometrySummary
            calculations={calculations}
            speakerWidth={speakerWidth}
            speakerDepth={speakerDepth}
            minBackWallDistance={minBackWallDistance}
            showAcousticCentre={showAcousticCentre}
          />

          {showCornerDistances && (
            <SpeakerCornerDistances
              leftCorners={cornerDistances.left}
              rightCorners={cornerDistances.right}
              toeInAngle={toeInAngle}
            />
          )}

          {showAcousticTreatment && (
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="h-5 w-5" />
                  Adaptacja akustyczna — Pozycje montażu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AcousticPanelTable panels={acousticPanels} roomWidth={roomWidth} roomLength={roomLength} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function ResultItem({
  label,
  value,
  unit,
  highlight = false,
  className = "",
}: {
  label: string
  value: number
  unit: string
  highlight?: boolean
  className?: string
}) {
  return (
    <div className={`rounded-lg bg-muted p-3 ${className}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold ${highlight ? "text-destructive" : "text-foreground"}`}>
        {value.toFixed(2)} {unit}
      </p>
    </div>
  )
}
