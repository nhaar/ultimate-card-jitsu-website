import { useContext } from 'react'
import DateTimeDisplay from './DateTimeDisplay'
import { useCountdown } from './hooks/useCountdown'
import { TournamentContext, TournamentState } from './context/TournamentContext'

/** Component that renders a time (countdown) in a readable fashion */
function ShowCounter ({ days, hours, minutes, seconds }: {
  days: number
  hours: number
  minutes: number
  seconds: number
}): JSX.Element {
  const isDaysTrailing = days === 0
  const isHoursTrailing = isDaysTrailing && hours === 0
  const isMinutesTrailing = isHoursTrailing && minutes === 0

  return (
    <div
      className='show-counter' style={{
        textAlign: 'center',
        margin: 'auto'
      }}
    >
      <DateTimeDisplay value={days} type={days === 1 ? 'Day' : 'Days'} isDanger={false} isLast={false} isTrailingZero={isDaysTrailing} />
      <DateTimeDisplay value={hours} type={hours === 1 ? 'Hour' : 'Hours'} isDanger={false} isLast={false} isTrailingZero={isHoursTrailing} />
      <DateTimeDisplay value={minutes} type={minutes === 1 ? 'Minute' : 'Minutes'} isDanger={false} isLast={false} isTrailingZero={isMinutesTrailing} />
      <DateTimeDisplay value={seconds} type={seconds === 1 ? 'Second' : 'Seconds'} isDanger={false} isLast isTrailingZero={false} />
    </div>
  )
}

/** Component that shows a countdown timer towards a specific date */
export default function CountdownTimer ({ targetDate }: {
  targetDate: Date
}): JSX.Element {
  const [days, hours, minutes, seconds] = useCountdown(targetDate)
  const { setState } = useContext(TournamentContext)

  if (minutes + seconds <= 0) {
    if (setState === undefined) {
      throw new Error('Should be defined at this point')
    } else {
      setState(TournamentState.WaitingStart)
    }
    return <div />
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
