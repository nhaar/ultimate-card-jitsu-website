/** Component that displays a "haiku", three centered lines. */
export default function Haiku ({ first, second, third }: {
  first: string
  second: string
  third: string
}): JSX.Element {
  return (
    <div style={{
      textAlign: 'center',
      textShadow: '3px 3px 3px #000, -3px 3px 3px #000, -3px -3px 3px #000, 3px -3px 3px #000'
    }}
    >
      <div>{first}</div>
      <div>{second}</div>
      <div>{third}</div>
    </div>
  )
}
