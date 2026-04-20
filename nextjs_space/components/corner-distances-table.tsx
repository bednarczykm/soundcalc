interface CornerDistancesTableProps {
  leftDistances: { LF: number; RF: number; LR: number; RR: number }
  rightDistances: { LF: number; RF: number; LR: number; RR: number }
}

export function CornerDistancesTable({ leftDistances, rightDistances }: CornerDistancesTableProps) {
  const formatCm = (val: number) => (val * 100).toFixed(1)

  const leftDelta = Math.abs(leftDistances.LF - leftDistances.RF)
  const rightDelta = Math.abs(rightDistances.LF - rightDistances.RF)

  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs">
      <h4 className="font-semibold text-muted-foreground uppercase tracking-wide mb-2 text-[10px]">
        Rogi â Åciana frontowa (cm)
      </h4>
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1 font-medium text-muted-foreground">RÃ³g</th>
            <th className="text-right py-1 font-medium text-muted-foreground">L</th>
            <th className="text-right py-1 font-medium text-muted-foreground">R</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          <tr className="border-b border-muted/50">
            <td className="py-1 text-muted-foreground">LF</td>
            <td className="text-right py-1">{formatCm(leftDistances.LF)}</td>
            <td className="text-right py-1">{formatCm(rightDistances.LF)}</td>
          </tr>
          <tr className="border-b border-muted/50">
            <td className="py-1 text-muted-foreground">RF</td>
            <td className="text-right py-1">{formatCm(leftDistances.RF)}</td>
            <td className="text-right py-1">{formatCm(rightDistances.RF)}</td>
          </tr>
          <tr className="border-b border-muted/50">
            <td className="py-1 text-muted-foreground">LR</td>
            <td className="text-right py-1">{formatCm(leftDistances.LR)}</td>
            <td className="text-right py-1">{formatCm(rightDistances.LR)}</td>
          </tr>
          <tr className="border-b border-muted/50">
            <td className="py-1 text-muted-foreground">RR</td>
            <td className="text-right py-1">{formatCm(leftDistances.RR)}</td>
            <td className="text-right py-1">{formatCm(rightDistances.RR)}</td>
          </tr>
          <tr className="text-violet-600 font-semibold">
            <td className="py-1.5 pt-2">Î LFâRF</td>
            <td className="text-right py-1.5 pt-2">{formatCm(leftDelta)}</td>
            <td className="text-right py-1.5 pt-2">{formatCm(rightDelta)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
