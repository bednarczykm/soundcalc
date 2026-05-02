import type { AcousticPanel } from "@/components/stereo-calculator"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface AcousticPanelTableProps {
  panels: AcousticPanel[]
  roomWidth: number
  roomLength: number
}

export function AcousticPanelTable({ panels, roomWidth, roomLength }: AcousticPanelTableProps) {
  const getCornerLabel = (panel: AcousticPanel): string => {
    if (panel.type !== "bass-trap") return ""
    if (panel.centerX === 0 && panel.centerY === 0) return "Lewy przedni"
    if (panel.centerX === roomWidth && panel.centerY === 0) return "Prawy przedni"
    if (panel.centerX === 0 && panel.centerY === roomLength) return "Lewy tylny"
    if (panel.centerX === roomWidth && panel.centerY === roomLength) return "Prawy tylny"
    return "Róg"
  }

  // Group panels by type
  const sidePanels = panels.filter((p) => p.type === "side")
  const frontPanels = panels.filter((p) => p.type === "front")
  const backPanels = panels.filter((p) => p.type === "back")
  const bassTraps = panels.filter((p) => p.type === "bass-trap")

  return (
    <div className="space-y-4">
      {/* Side Panels */}
      {sidePanels.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base text-orange-800">Panele boczne (first reflection)</CardTitle>
            <CardDescription className="text-orange-700/80">
              Montaż na ścianach bocznych w punkcie pierwszego odbicia
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {sidePanels.map((panel, index) => {
                const halfHeight = panel.width / 2
                const startY = panel.centerY - halfHeight
                const endY = panel.centerY + halfHeight
                const wallName = panel.wall === "left" ? "Lewa ściana" : "Prawa ściana"

                return (
                  <div key={`side-${index}`} className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="font-semibold text-orange-800 mb-2">{wallName}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Od ściany frontowej:</span>
                        <span className="ml-2 font-mono font-semibold text-orange-700">
                          {startY.toFixed(2)}m - {endY.toFixed(2)}m
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Środek:</span>
                        <span className="ml-2 font-mono font-semibold">{panel.centerY.toFixed(2)}m</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rozmiar:</span>
                        <span className="ml-2 font-mono">
                          {panel.width.toFixed(2)} × {panel.height.toFixed(2)}m
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Front Panels */}
      {frontPanels.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base text-orange-800">Panele frontowe (za głośnikami)</CardTitle>
            <CardDescription className="text-orange-700/80">
              Montaż na ścianie frontowej bezpośrednio za głośnikami
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {frontPanels.map((panel, index) => {
                const halfWidth = panel.width / 2
                const startX = panel.centerX - halfWidth
                const endX = panel.centerX + halfWidth
                const position = index === 0 ? "Za lewym głośnikiem" : "Za prawym głośnikiem"

                return (
                  <div key={`front-${index}`} className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="font-semibold text-orange-800 mb-2">{position}</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Od lewej ściany:</span>
                        <span className="ml-2 font-mono font-semibold text-orange-700">
                          {startX.toFixed(2)}m - {endX.toFixed(2)}m
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Środek:</span>
                        <span className="ml-2 font-mono font-semibold">{panel.centerX.toFixed(2)}m</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rozmiar:</span>
                        <span className="ml-2 font-mono">
                          {panel.width.toFixed(2)} × {panel.height.toFixed(2)}m
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Back Panel */}
      {backPanels.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base text-orange-800">Panel tylny (za słuchaczem)</CardTitle>
            <CardDescription className="text-orange-700/80">
              Montaż na ścianie tylnej za pozycją odsłuchową
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {backPanels.map((panel, index) => {
                const halfWidth = panel.width / 2
                const startX = panel.centerX - halfWidth
                const endX = panel.centerX + halfWidth

                return (
                  <div key={`back-${index}`} className="bg-white rounded-lg p-3 border border-orange-200">
                    <div className="font-semibold text-orange-800 mb-2">Za słuchaczem</div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Od lewej ściany:</span>
                        <span className="ml-2 font-mono font-semibold text-orange-700">
                          {startX.toFixed(2)}m - {endX.toFixed(2)}m
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Środek:</span>
                        <span className="ml-2 font-mono font-semibold">{panel.centerX.toFixed(2)}m</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rozmiar:</span>
                        <span className="ml-2 font-mono">
                          {panel.width.toFixed(2)} × {panel.height.toFixed(2)}m
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bass Traps */}
      {bassTraps.length > 0 && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader className="py-3 pb-2">
            <CardTitle className="text-base text-purple-800">Bass trapy (narożniki)</CardTitle>
            <CardDescription className="text-purple-700/80">
              Montaż w rogach pokoju dla absorpcji niskich częstotliwości
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {bassTraps.map((panel, index) => (
                <div key={`bass-${index}`} className="bg-white rounded-lg p-3 border border-purple-200 text-center">
                  <div className="font-semibold text-purple-800">{getCornerLabel(panel)}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    ({panel.centerX.toFixed(1)}m, {panel.centerY.toFixed(1)}m)
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
