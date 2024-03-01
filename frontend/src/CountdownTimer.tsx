import DateTimeDisplay from './DateTimeDisplay'
import { useCountdown } from './hooks/useCountdown'

/** Expired noticed to refresh the page */
function ExpiredNotice (): JSX.Element {
  return (
    <div className='expired-notice'>
      <meta http-equiv='refresh' content='1' />
    </div>
  )
}

/** Component that renders a time (countdown) in a readable fashion */
function ShowCounter ({ days, hours, minutes, seconds }: {
  days: number
  hours: number
  minutes: number
  seconds: number
}): JSX.Element {
  return (
    <div
      className='show-counter' style={{
        textAlign: 'center',
        margin: 'auto'
      }}
    >
      <DateTimeDisplay value={days} type={days === 1 ? 'Day' : 'Days'} isDanger={false} />, <DateTimeDisplay value={hours} type={hours === 1 ? 'Hour' : 'Hours'} isDanger={false} />,&nbsp;
      <DateTimeDisplay value={minutes} type={minutes === 1 ? 'Minute' : 'Minutes'} isDanger={false} />, <DateTimeDisplay value={seconds} type={seconds === 1 ? 'Second' : 'Seconds'} isDanger={false} />
    </div>
  )
}

/** Component that shows a countdown timer towards a specific date */
export default function CountdownTimer ({ targetDate }: {
  targetDate: Date
}): JSX.Element {
  const [days, hours, minutes, seconds] = useCountdown(targetDate)

  if (days + hours + minutes + seconds <= 0) {
    return <ExpiredNotice />
  } else {
    return (
      <ShowCounter
        days={days}
        hours={hours}
        minutes={minutes}
        seconds={seconds}
      />
    )
  }
}
