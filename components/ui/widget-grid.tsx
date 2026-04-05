"use client"
import { useState, type ReactNode } from "react"
import { GripVertical, X, Plus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Widget {
  id: string
  title: string
  component: ReactNode
  size: "sm" | "md" | "lg"
}

interface WidgetGridProps {
  widgets: Widget[]
  editable?: boolean
  onRemove?: (id: string) => void
  onAdd?: () => void
}

export function WidgetGrid({ widgets, editable = false, onRemove, onAdd }: WidgetGridProps) {
  const sizeClasses = { sm: "col-span-1", md: "col-span-2", lg: "col-span-3" }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {widgets.map(w => (
        <Card key={w.id} className={`${sizeClasses[w.size]} dark:bg-gray-900 dark:border-gray-800`}>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              {editable && <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />}
              <CardTitle className="text-sm">{w.title}</CardTitle>
            </div>
            {editable && onRemove && (
              <button onClick={() => onRemove(w.id)} className="text-muted-foreground hover:text-red-500">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </CardHeader>
          <CardContent>{w.component}</CardContent>
        </Card>
      ))}
      {editable && onAdd && (
        <Card className="border-dashed border-2 flex items-center justify-center cursor-pointer hover:border-[#10B981] transition-colors min-h-[120px] dark:border-gray-700" onClick={onAdd}>
          <div className="text-center text-muted-foreground">
            <Plus className="h-8 w-8 mx-auto mb-1" />
            <span className="text-xs">위젯 추가</span>
          </div>
        </Card>
      )}
    </div>
  )
}
