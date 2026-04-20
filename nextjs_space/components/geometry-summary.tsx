import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, AlertTriangle } from "lucide-react"

interface GeometrySummaryProps {
  calculations: {
    leftSpeaker: { x: number; y: number }
    rightSpeaker: { x: number; y: number }
    listener: { x: number; y: number }
    roomWidth: number
    roomLength: number
    speakerSpacing: number
    speakerEdgeToEdge: number
    listenerFromFront: number
    listenerFromBack: number
    listenerSpeakerDistance: number
    actualAngle: number
    leftEdgeToWall: number
    rightEdgeToWall: number
    speakerFrontToWall: number
  }
  speakerWidth: number
  speakerDepth: number
  minBackWallDistance: number
  showAcousticCentre?: boolean
}

export function GeometrySummary({
  calculations,
  speakerWidth,
  speakerDepth,
  minBackWallDistance,
  showAcousticCentre = false,
}: GeometrySummaryProps) {
  const {
    leftSpeaker,
    rightSpeaker,
    listener,
    roomWidth,
    roomLength,
    speakerSpacing,
    speakerEdgeToEdge,
    listenerFromFront,
    listenerFromBack,
    listenerSpeakerDistance,
    actualAngle,
    leftEdgeToWall,
    rightEdgeToWall,
    speakerFrontToWall,
  } = calculations

  const speakerCentreToWall = leftSpeaker.y
  const speakerCentreOffset = speakerDepth / 2

  const isTooCloseToBack = listenerFromBack < minBackWallDistance
  const isLeftSpeakerTooClose = leftEdgeToWall < 0.2
  const isRightSpeakerTooClose = rightEdgeToWall < 0.2
  const hasWarnings = isTooCloseToBack || isLeftSpeakerTooClose || isRightSpeakerTooClose

  const DataRow = ({
    label,
    value,
    warning = false,
    unit = "m",
    highlight = false,
  }: { label: string; value: string | number; warning?: boolean; unit?: string; highlight?: boolean }) => (
    <div className="flex justify-between items-center py-1.5 border-b border-muted/50 last:border-0">
      <span className={`text-sm ${highlight ? "text-emerald-600 font-medium" : "text-muted-foreground"}`}>{label}</span>
      <span
        className={`font-mono font-semibold text-sm ${warning ? "text-destructive" : highlight ? "text-emerald-600" : ""}`}
      >
        {typeof value === "number" ? value.toFixed(2) : value}
        {unit}
      </span>
    </div>
  )

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          Podsumowanie geometrii
          {hasWarnings ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Speaker distances */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">GÅoÅniki</h4>
          <div className="bg-muted/30 rounded-lg p-3">
            <DataRow label="Lewy od Åciany (krawÄdÅº)" value={leftEdgeToWall} warning={isLeftSpeakerTooClose} />
            <DataRow label="Prawy od Åciany (krawÄdÅº)" value={rightEdgeToWall} warning={isRightSpeakerTooClose} />
            <DataRow label="Od Åciany frontowej (front)" value={speakerFrontToWall} />
            {showAcousticCentre && (
              <>
                <DataRow label="Årodek akustyczny od Åciany" value={speakerCentreToWall} highlight />
                <DataRow label="Offset (front â centre)" value={speakerCentreOffset} highlight />
              </>
            )}
            <DataRow label="Rozstaw C-C" value={speakerSpacing} />
            <DataRow label="Rozstaw krawÄdÅº-krawÄdÅº" value={speakerEdgeToEdge} />
          </div>
        </div>

        {/* Listener distances */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">SÅuchacz</h4>
          <div className="bg-muted/30 rounded-lg p-3">
            <DataRow label="Od Åciany frontowej" value={listenerFromFront} />
            <DataRow label="Od Åciany tylnej" value={listenerFromBack} warning={isTooCloseToBack} />
            <DataRow label="Do gÅoÅnika" value={listenerSpeakerDistance} />
            <DataRow label="KÄt odsÅuchu" value={actualAngle.toFixed(1)} unit="Â°" />
          </div>
        </div>

        {/* Positions */}
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pozycje (x, y)</h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-100 p-2 text-center">
              <p className="text-xs text-muted-foreground mb-1">Lewy</p>
              <p className="font-mono text-xs font-semibold">
                {leftSpeaker.x.toFixed(2)}, {leftSpeaker.y.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-slate-100 p-2 text-center">
              <p className="text-xs text-muted-foreground mb-1">Prawy</p>
              <p className="font-mono text-xs font-semibold">
                {rightSpeaker.x.toFixed(2)}, {rightSpeaker.y.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg bg-blue-100 p-2 text-center">
              <p className="text-xs text-muted-foreground mb-1">SÅuchacz</p>
              <p className="font-mono text-xs font-semibold">
                {listener.x.toFixed(2)}, {listener.y.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {hasWarnings && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
            <div className="flex items-center gap-2 text-amber-800 font-medium mb-1">
              <AlertTriangle className="h-4 w-4" />
              OstrzeÅ¼enia
            </div>
            <ul className="text-amber-700 text-xs space-y-1 ml-6 list-disc">
              {isTooCloseToBack && <li>SÅuchacz zbyt blisko Åciany tylnej (min. {minBackWallDistance}m)</li>}
              {isLeftSpeakerTooClose && <li>Lewy gÅoÅnik zbyt blisko Åciany (min. 0.2m)</li>}
              {isRightSpeakerTooClose && <li>Prawy gÅoÅnik zbyt blisko Åciany (min. 0.2m)</li>}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
