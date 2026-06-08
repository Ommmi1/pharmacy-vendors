import clsx from 'clsx'
import styles from './Button.module.css'

type Variant = 'accent' | 'outline' | 'subtle' | 'red' | 'ghost'
type Size    = 'sm' | 'md' | 'lg'

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?:    Size
  loading?: boolean
  icon?:    React.ReactNode
}

export default function Button({
  variant = 'subtle',
  size    = 'md',
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={clsx(styles.btn, styles[variant], styles[size], className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className={styles.spinner} /> : icon}
      {children}
    </button>
  )
}
