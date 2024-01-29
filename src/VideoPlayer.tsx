import { useContext, useEffect, useState } from 'react'
import { SocketContext } from './Context/VideoContext'

export default function VidePlayer (): JSX.Element {
  const { myVideo, startScreensharing, userVideo, connectPlayer, socket } = useContext(SocketContext)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (socket !== undefined && !isConnected) {
      connectPlayer()
      setIsConnected(true)
    }
  }, [socket])

  return (
    <div>
      <button onClick={startScreensharing}>SCREENSHARE</button>
      Hello videos!
      <div>
        MY VIDEO

        <video playsInline muted ref={myVideo} autoPlay />
      </div>
    </div>
  )
}
