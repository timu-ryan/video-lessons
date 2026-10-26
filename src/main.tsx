import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { screenCss } from './features/settings/palettes'
import { applyTheme, readSettings } from './features/settings/useSettings'
import './index.css'

const root = document.getElementById('root')
if (!root) throw new Error('Не найден #root')

// Палитры — до первого кадра, чтобы слайд не мигнул чужими цветами
const themes = document.createElement('style')
themes.textContent = screenCss()
document.head.append(themes)
applyTheme(readSettings().theme)

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
