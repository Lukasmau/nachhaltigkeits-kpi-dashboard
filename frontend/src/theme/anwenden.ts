import { dunkel } from '../tokens'

export function wendeThemeAn() {
  const root = document.documentElement
  for (const [name, wert] of Object.entries(dunkel)) {
    root.style.setProperty(`--${name}`, wert)
  }
}
