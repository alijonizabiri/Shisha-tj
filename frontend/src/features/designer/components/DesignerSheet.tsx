import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import { measurementFormSchema, type MeasurementFormValues } from '../schemas'
import { MeasurementForm } from './MeasurementForm'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: MeasurementFormValues
  disableLeadSelector?: boolean
  onApply: (values: MeasurementFormValues) => void
}

// Sheet side by screen width — bottom on mobile/tablet, right on desktop
function useSheetSide(): 'bottom' | 'right' {
  if (typeof window === 'undefined') return 'bottom'
  return window.innerWidth >= 1024 ? 'right' : 'bottom'
}

export function DesignerSheet({ open, onOpenChange, values, disableLeadSelector, onApply }: Props) {
  const side = useSheetSide()

  const form = useForm<MeasurementFormValues>({
    resolver: zodResolver(measurementFormSchema),
    mode: 'onBlur',
    defaultValues: values,
  })

  // Sync form with latest values each time sheet opens
  useEffect(() => {
    if (open) form.reset(values)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleApply(v: MeasurementFormValues) {
    onApply(v)
    onOpenChange(false)
  }

  const sheetClass =
    side === 'bottom'
      ? 'h-[85vh] sm:h-[70vh] overflow-y-auto'
      : 'w-[420px] overflow-y-auto'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={sheetClass}>
        <SheetHeader className="mb-4">
          <SheetTitle>Параметры замера</SheetTitle>
        </SheetHeader>

        <MeasurementForm
          form={form}
          onSubmit={handleApply}
          disableLeadSelector={disableLeadSelector}
          submitLabel="Применить"
        />
      </SheetContent>
    </Sheet>
  )
}
