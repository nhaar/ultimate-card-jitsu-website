/** Component that renders a time in text */
export default function DateTimeDisplay ({ value, type, isDanger, isLast, isTrailingZero }: {
  /** Number value */
  value: number
  /** The "counter" noun, eg. "hours" */
  type: string
  /** Whether or not to display in danger colors */
  isDanger: boolean,
  /** Whether or not this is the last element in the right */
  isLast: boolean
  /** Whether or not this is a trailing zero */
  isTrailingZero: boolean
}): JSX.Element {
  if (isTrailingZero) {
    return <span />
  }

  const sep = isLast ? '' : ', '

  return (
    <span className={isDanger ? 'countdown danger' : 'countdown'}>
      <span>{value}</span> <span>{type}{sep}</span>
    </span>
  )
}
