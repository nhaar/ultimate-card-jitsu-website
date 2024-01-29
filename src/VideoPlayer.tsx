import { useContext, useEffect, useState } from 'react'
import { SocketContext } from './Context/VideoContext'
import { Socket } from 'socket.io-client'

/** Component for the video player for the user page */
export default function VideoPlayer (): JSX.Element {
  const { myVideo, startScreensharing, connectPlayer, socket }: {
    myVideo: React.Ref<HTMLVideoElement>
    startScreensharing: () => void
    connectPlayer: () => void
    socket: Socket | undefined
  } = useContext(SocketContext)
  const [isConnected, setIsConnected] = useState(false)

  /** Connects player to the queue */
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
