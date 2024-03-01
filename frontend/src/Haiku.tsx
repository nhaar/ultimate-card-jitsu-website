/** Component that displays a "haiku", three centered lines. */
export default function Haiku ({ first, second, third }: {
  first: string
  second: string
  third: string
}): JSX.Element {
  return (
    <div
      className='black-shadow' style={{
        textAlign: 'center'
      }}
    >
      <div>{first}</div>
      <div>{second}</div>
      <div>{third}</div>
    </div>
  )
}
