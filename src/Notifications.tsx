import { useContext } from 'react'
import { SocketContext } from './Context/VideoContext'

export default function Notifications (): JSX.Element {
  const { answerCall, call, callAccepted } = useContext(SocketContext)



  return (
    <div>
    </div>
  )
}
