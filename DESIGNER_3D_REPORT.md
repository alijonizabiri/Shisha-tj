# SHISHA_TJ — Designer 3D Report
Дата: 2026-06-18

## Новые зависимости (npm)
| Пакет | Версия |
|---|---|
| `@react-three/fiber` | ^9.x |
| `@react-three/drei` | ^10.x |
| `three` | ^0.x |
| `@types/three` | ^0.x |

## Миграции
| Миграция | Статус |
|---|---|
| `20260618032406_AddGlassShapeAndSetId` | Pending (apply with `dotnet ef database update`) |

Добавляет 3 колонки в таблицу `glasses`:
- `shape` (varchar(20), default `'Flat'`, not null)
- `set_id` (uuid, nullable)
- `curvature_radius_mm` (integer, nullable)

## Новые типы/enum

### Backend — `PanelShape.cs`
```
Flat = 0, LShapeLeft = 1, LShapeRight = 2, Curved = 3
```

### Frontend — `PanelShape` (в `lib/types.ts`)
```
'Flat' | 'LShapeLeft' | 'LShapeRight' | 'Curved'
```

## Новые файлы

| Файл | Описание |
|---|---|
| `backend/src/Shisha.Domain/Enums/PanelShape.cs` | Enum формы панели |
| `frontend/src/features/designer/components/ThreeCanvas.tsx` | 3D просмотрщик кабины (R3F) |
| `frontend/src/features/designer/components/CabinSetForm.tsx` | Формы для Г-образной и полукруглой кабин + тип-карточки |

## Изменённые файлы

| Файл | Что изменилось |
|---|---|
| `Glass.cs` | + Shape, SetId, CurvatureRadiusMm |
| `GlassConfiguration.cs` | + EF конфигурация новых полей |
| `MeasurementDtos.cs` | + поля в PanelInputDto и GlassResponse |
| `MeasurementService.cs` | + маппинг, + валидация Curved |
| `lib/types.ts` | + PanelShape type, + shape/setId/curvatureRadiusMm в Panel |
| `lib/defaultHoles.ts` | LShape/Curved используют логику Flat |
| `lib/computePanels.ts` | + shape: 'Flat' в computeInitialPanels, + computeMetricsFromPanels |
| `api.ts` | + поля в PanelInput и GlassResponse |
| `DesignerPage.tsx` | + viewMode state, ThreeCanvas, customPanels поддержка |
| `DesignerTopBar.tsx` | + viewMode/onViewModeChange props, 2D/3D toggle |
| `DesignerSheet.tsx` | + CabinTypeCards, CabinSetForm условный рендер |
| `DrawingCanvas.tsx` | + цвета по shape, Curved label, LShape угловые значки, set grouping |

## Что НЕ реализовано (оставлено на будущее)
- Редактирование дырок в 3D режиме (drag в 3D)
- Анимация переключения 2D ↔ 3D
- Экспорт 3D скриншота
- Точная геометрия Curved (сейчас 90° дуга фиксированная независимо от параметров)
- Code splitting для ThreeCanvas (сейчас в одном чанке ~1MB с Three.js)
- Метрики (площадь, гонорар) для L-shape и Curved (сейчас null если measureMm вне диапазона)

## Известные ограничения
- Curved отображается в 3D как `CylinderGeometry` с `thetaLength = Math.PI/2` (90°) — не зависит от реального `curvatureRadiusMm`
- DesignerPage chunk 1 MB — Three.js тяжёлый, рекомендуется добавить `React.lazy` для ThreeCanvas
- При переключении 2D → 3D теряется выбор панели (selectedPanelId сбрасывается при следующем render)
