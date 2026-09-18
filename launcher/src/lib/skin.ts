import type { CSSProperties } from 'react'
import { CUSTOM_DEFAULT, type CustomSkin } from './custom.ts'
import { kitById, type KitId } from './kits.ts'

export function kitCssVars(id: KitId, custom?: CustomSkin): Record<string, string> {
  const k = id === 'custom' ? { ...CUSTOM_DEFAULT, ...custom } : kitById(id)
  return {
    '--pad-accent': k.accent,
    '--pad-ink': k.ink,
    '--pad-paper': k.paper,
    '--pad-muted': k.muted,
    '--pad-stroke': k.stroke,
    '--pad-radius': k.radius,
    '--pad-font': k.font,
  }
}

export function kitVarsStyle(id: KitId, custom?: CustomSkin): CSSProperties {
  return kitCssVars(id, custom) as CSSProperties
}
