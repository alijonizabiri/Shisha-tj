import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/shared/ui/sheet'
import { measurementFormSchema, type MeasurementFormValues } from '../schemas'
import type { Panel } from '../lib/types'
import { MeasurementForm } from './MeasurementForm'
import { CabinTypeCards, CabinSetForm } from './CabinSetForm'

type CabinType = 'flat' | 'lshape' | 'curved'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: MeasurementFormValues
  disableLeadSelector?: boolean
  onApply: (values: MeasurementFormValues, customPanels?: Panel[]) => void
}

// Sheet side by screen width — bottom on mobile/tablet, right on desktop
function useSheetSide(): 'bottom' | 'right' {
  if (typeof window === 'undefined') return 'bottom'
  return window.innerWidth >= 1024 ? 'right' : 'bottom'
}

export function DesignerSheet({ open, onOpenChange, values, disableLeadSelector, onApply }: Props) {
  const side = useSheetSide()
  const [cabinType, setCabinType] = useState<CabinType>('flat')

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

  function handleFlatApply(v: MeasurementFormValues) {
    onApply(v)
    onOpenChange(false)
  }

  function handleSetApply(v: MeasurementFormValues, panels: Panel[]) {
    onApply(v, panels)
    onOpenChange(false)
  }

  const sheetClass =
    side === 'bottom'
      ? 'h-[90vh] sm:h-[80vh] overflow-y-auto'
      : 'w-[440px] overflow-y-auto'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} className={sheetClass}>
        <SheetHeader className="mb-4">
          <SheetTitle>Параметры замера</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5">
          <CabinTypeCards selected={cabinType} onChange={setCabinType} />

          {cabinType === 'flat' && (
            <MeasurementForm
              form={form}
              onSubmit={handleFlatApply}
              disableLeadSelector={disableLeadSelector}
              submitLabel="Применить"
            />
          )}

          {(cabinType === 'lshape' || cabinType === 'curved') && (
            <CabinSetForm
              cabinType={cabinType}
              initialValues={form.getValues()}
              disableLeadSelector={disableLeadSelector}
              onApply={handleSetApply}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
