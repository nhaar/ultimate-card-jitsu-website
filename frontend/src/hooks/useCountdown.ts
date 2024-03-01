import { useEffect, useState } from 'react'

/** Array where the first number is for days, second for hours, third for minutes and fourth for seconds */
type TimeArray = [number, number, number, number]

/** Hook that will take a target date and return an array with the time left to that */
function useCountdown (targetDate: Date): TimeArray {
  const countDownDate = new Date(targetDate).getTime()

  const [countDown, setCountDown] = useState(
    countDownDate - new Date().getTime()
  )

  useEffect(() => {
    const interval = setInterval(() => {
      setCountDown(countDownDate - new Date().getTime())
    }, 1000)

    return () => clearInterval(interval)
  }, [countDownDate])

  return getReturnValues(countDown)
}

/** Function that takes a number in miliseconds that represents the time left and returns the time values */
function getReturnValues (countDown: number): TimeArray {
  // calculate time left
  const days = Math.floor(countDown / (1000 * 60 * 60 * 24))
  const hours = Math.floor(
    (countDown % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  )
  const minutes = Math.floor((countDown % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((countDown % (1000 * 60)) / 1000)

  return [days, hours, minutes, seconds]
}

export { useCountdown }
