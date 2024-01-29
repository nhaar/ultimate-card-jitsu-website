import { useContext, useEffect, useState } from 'react'
import { PlayerInfo, SocketContext } from './Context/VideoContext'
import { Socket } from 'socket.io-client'

/** Component that handles the video players for the admin */
export function AdminVideoPlayer (): JSX.Element {
  const { userVideo, startScreensharing, socket, connectAdmin, playerInfo, callUser }: {
    userVideo: React.Ref<HTMLVideoElement>
    startScreensharing: () => void
    socket: Socket | undefined
    connectAdmin: () => void
    playerInfo: PlayerInfo[]
    callUser: (id: string) => void
  } = useContext(SocketContext)
  const [isConnected, setIsConnected] = useState(false)

  /** Connects admin when the socket is connected */
  useEffect(() => {
    if (socket !== undefined && !isConnected) {
      connectAdmin()
      setIsConnected(true)
    }
  }, [socket])

  return (
    <div>

      <button onClick={startScreensharing}>SCREENSHARE</button>
      Hello videos!
      <div>
        {playerInfo.map((player, i) => {
          return (
            <div key={i}>
              {player.id}
              <button onClick={() => callUser(player.id)}>CALL THIS USER!!</button>
            </div>
          )
        })}
      </div>
      <div>
        USER VIDEO
        <video playsInline muted ref={userVideo} autoPlay />
      </div>
    </div>
  )
}
