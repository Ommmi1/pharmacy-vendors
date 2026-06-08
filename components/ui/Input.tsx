import clsx from 'clsx'
import styles from './Input.module.css'

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?:    string
  error?:    string
  hint?:     string
  mono?:     boolean
}

export default function Input({ label, error, hint, mono, className, id, ...rest }: Props) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className={styles.wrap}>
      {label && <label htmlFor={inputId} className={styles.label}>{label}</label>}
      <input
        id={inputId}
        className={clsx(styles.input, mono && styles.mono, error && styles.hasError, className)}
        {...rest}
      />
      {error && <div className={styles.error}>{error}</div>}
      {hint  && !error && <div className={styles.hint}>{hint}</div>}
    </div>
  )
}
