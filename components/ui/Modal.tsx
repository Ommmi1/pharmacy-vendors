import { useEffect } from 'react'
import styles from './Modal.module.css'

interface Props {
  open:     boolean
  onClose:  () => void
  title?:   string
  subtitle?: string
  children: React.ReactNode
  maxWidth?: string
  accentTop?: boolean
}

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = '500px', accentTop }: Props) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={styles.modal} style={{ maxWidth, borderTop: accentTop ? '3px solid var(--accent)' : undefined }}>
        {(title || subtitle) && (
          <div className={styles.header}>
            {title    && <h2 className={styles.title}>{title}</h2>}
            {subtitle && <p  className={styles.sub}>{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
