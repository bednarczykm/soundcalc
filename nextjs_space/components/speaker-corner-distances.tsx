import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CornerDistances {
  LF: number // Left Front
  RF: number // Right Front
  LR: number // Left Rear
  RR: number // Right Rear
}

interface SpeakerCornerDistancesProps {
  leftCorners: CornerDistances
  rightCorners: CornerDistances
  toeInAngle: number
}

export function SpeakerCornerDistances({ leftCorners, rightCorners, toeInAngle }: SpeakerCornerDistancesProps) {
  // Calculate delta between front corners for each speaker
  const leftDelta = Math.abs(leftCorners.LF - leftCorners.RF)
  const rightDelta = Math.abs(rightCorners.LF - rightCorners.RF)

  const DataRow = ({
    label,
    value,
    highlight = false,
  }: {
    label: string
    value: number
    highlight?: boolean
  }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-muted/50 last:border-0">
      <span className={`text-sm ${highlight ? "text-indigo-600 font-medium" : "text-muted-foreground"}`}>{label}</span>
      <span className={`font-mono font-semibold text-sm ${highlight ? "text-indigo-600" : ""}`}>
        {(value * 100).toFixed(1)} cm
      </span>
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Rogi głośników → Ściana frontowa
          <span className="text-xs font-normal text-muted-foreground ml-auto">toe-in: {toeInAngle}°</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Left speaker corners */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Lewy głośnik (L)</h4>
          <div className="bg-muted/30 rounded-lg p-3">
            <DataRow label="LF (lewy-przód)" value={leftCorners.LF} />
            <DataRow label="RF (prawy-przód)" value={leftCorners.RF} />
            <DataRow label="LR (lewy-tył)" value={leftCorners.LR} />
            <DataRow label="RR (prawy-tył)" value={leftCorners.RR} />
            <div className="mt-2 pt-2 border-t border-muted">
              <DataRow label="Δ LF ↔ RF" value={leftDelta} highlight />
            </div>
          </div>
        </div>

        {/* Right speaker corners */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Prawy głośnik (R)
          </h4>
          <div className="bg-muted/30 rounded-lg p-3">
            <DataRow label="LF (lewy-przód)" value={rightCorners.LF} />
            <DataRow label="RF (prawy-przód)" value={rightCorners.RF} />
            <DataRow label="LR (lewy-tył)" value={rightCorners.LR} />
            <DataRow label="RR (prawy-tył)" value={rightCorners.RR} />
            <div className="mt-2 pt-2 border-t border-muted">
              <DataRow label="Δ LF ↔ RF" value={rightDelta} highlight />
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
          <p>
            <strong>LF/RF</strong> = przednie rogi głośnika (lewy/prawy)
            <br />
            <strong>LR/RR</strong> = tylne rogi głośnika (lewy/prawy)
            <br />
            <strong>Δ</strong> = różnica odległości przednich rogów od ściany
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

// Helper function to calculate corner positions
export function calculateSpeakerCorners(
  centerX: number,
  centerY: number,
  width: number,
  depth: number,
  toeInAngle: number, // in degrees
  isRightSpeaker: boolean,
): {
  LF: { x: number; y: number }
  RF: { x: number; y: number }
  LR: { x: number; y: number }
  RR: { x: number; y: number }
} {
  // Convert toe-in angle to radians
  // For left speaker: positive toe-in rotates clockwise (towards center/listener)
  // For right speaker: positive toe-in rotates counter-clockwise (towards center/listener)
  const angleRad = ((isRightSpeaker ? -toeInAngle : toeInAngle) * Math.PI) / 180

  // In room coordinates:
  // - Front wall is at y=0
  // - Y increases towards listener (back of room)
  // - Speaker "front" (baffle) faces towards front wall (negative Y direction from center)

  // Front vector (pointing towards front wall, which is -Y direction, but rotated by toe-in)
  // At 0° toe-in: front points to -Y (towards front wall)
  const frontX = Math.sin(angleRad)
  const frontY = -Math.cos(angleRad) // Negative because front faces towards y=0

  // Side vector (perpendicular to front, pointing to the right of the speaker when viewed from behind)
  // This is a 90° clockwise rotation of the front vector
  const sideX = -frontY // = cos(angleRad)
  const sideY = frontX // = sin(angleRad)

  // Half dimensions
  const halfW = width / 2
  const halfD = depth / 2

  // Calculate corners (from speaker's perspective, looking at the front baffle):
  // LF = center + (halfD * front) - (halfW * side) -- front-left corner
  // RF = center + (halfD * front) + (halfW * side) -- front-right corner
  // LR = center - (halfD * front) - (halfW * side) -- rear-left corner
  // RR = center - (halfD * front) + (halfW * side) -- rear-right corner

  return {
    LF: {
      x: centerX + halfD * frontX - halfW * sideX,
      y: centerY + halfD * frontY - halfW * sideY,
    },
    RF: {
      x: centerX + halfD * frontX + halfW * sideX,
      y: centerY + halfD * frontY + halfW * sideY,
    },
    LR: {
      x: centerX - halfD * frontX - halfW * sideX,
      y: centerY - halfD * frontY - halfW * sideY,
    },
    RR: {
      x: centerX - halfD * frontX + halfW * sideX,
      y: centerY - halfD * frontY + halfW * sideY,
    },
  }
}

// Calculate perpendicular distance from corner to front wall (y=0)
export function calculateCornerDistancesToFrontWall(corners: {
  LF: { x: number; y: number }
  RF: { x: number; y: number }
  LR: { x: number; y: number }
  RR: { x: number; y: number }
}): { LF: number; RF: number; LR: number; RR: number } {
  // Front wall is at y=0, perpendicular distance is simply the y-coordinate
  return {
    LF: corners.LF.y,
    RF: corners.RF.y,
    LR: corners.LR.y,
    RR: corners.RR.y,
  }
}
