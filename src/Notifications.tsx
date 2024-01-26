import { useContext } from 'react'
import { SocketContext } from './Context/VideoContext'

export default function Notifications (): JSX.Element {
  const { answerCall, call, callAccepted } = useContext(SocketContext)

  // immediately answer call.
  if (call.isReceivedCall && !callAccepted) {
    answerCall()
  }

  return (
    <div>
    </div>
  )
}
