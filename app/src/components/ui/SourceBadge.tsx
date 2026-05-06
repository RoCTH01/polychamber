import type { Src } from '@/types'
import { SRC_LABEL } from '@/types'

interface Props {
  src: Src
  size?: 'sm' | 'lg'
}

export default function SourceBadge({ src, size = 'sm' }: Props) {
  const style = size === 'lg' ? { width: 22, height: 22, fontSize: 10, borderRadius: 5 } : undefined
  return (
    <span className={`src-icon src-${src}`} style={style}>
      {SRC_LABEL[src]}
    </span>
  )
}
