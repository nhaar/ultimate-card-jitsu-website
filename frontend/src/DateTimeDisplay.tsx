/** Component that renders a time in text */
export default function DateTimeDisplay ({ value, type, isDanger }: {
  /** Number value */
  value: number
  /** The "counter" noun, eg. "hours" */
  type: string
  /** Whether or not to display in danger colors */
  isDanger: boolean
}): JSX.Element {
  return (
    <span className={isDanger ? 'countdown danger' : 'countdown'}>
      <span>{value}</span> <span>{type}</span>
    </span>
  )
}
