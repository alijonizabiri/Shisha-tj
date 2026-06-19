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
import type { LShapeInitValues } from '../lib/glassesToFormValues'
import { MeasurementForm } from './MeasurementForm'
import { CabinTypeCards, CabinSetForm } from './CabinSetForm'

type CabinType = 'flat' | 'lshape' | 'curved'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  values: MeasurementFormValues
  disableLeadSelector?: boolean
  storageKey?: string
  lshapeInit?: LShapeInitValues
  onApply: (values: MeasurementFormValues, customPanels?: Panel[]) => void
}

// Sheet side by screen width — bottom on mobile/tablet, right on desktop
function useSheetSide(): 'bottom' | 'right' {
  if (typeof window === 'undefined') return 'bottom'
  return window.innerWidth >= 1024 ? 'right' : 'bottom'
}

export function DesignerSheet({ open, onOpenChange, values, disableLeadSelector, storageKey, lshapeInit, onApply }: Props) {
  const side = useSheetSide()

  const cabinTypeKey = storageKey ? `${storageKey}_cabintype` : null
  const savedCabinType = cabinTypeKey
    ? (localStorage.getItem(cabinTypeKey) as CabinType | null)
    : null

  // lshapeInit means we loaded an L-shape from backend — start on lshape tab
  const defaultCabinType: CabinType = lshapeInit ? 'lshape' : (savedCabinType ?? 'flat')
  const [cabinType, setCabinType] = useState<CabinType>(defaultCabinType)

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

  // When lshapeInit arrives (async load), switch to lshape tab
  useEffect(() => {
    if (lshapeInit) setCabinType('lshape')
  }, [lshapeInit])

  function handleCabinTypeChange(t: CabinType) {
    setCabinType(t)
    if (cabinTypeKey) localStorage.setItem(cabinTypeKey, t)
  }

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
          <CabinTypeCards selected={cabinType} onChange={handleCabinTypeChange} />

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
              storageKey={storageKey}
              lshapeInit={lshapeInit}
              onApply={handleSetApply}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
