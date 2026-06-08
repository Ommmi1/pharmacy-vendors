import clsx from 'clsx'
import styles from './Badge.module.css'

type Color = 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'gold' | 'muted'

interface Props {
  color?: Color
  children: React.ReactNode
  className?: string
}

export default function Badge({ color = 'muted', children, className }: Props) {
  return (
    <span className={clsx(styles.badge, styles[color], className)}>
      {children}
    </span>
  )
}
