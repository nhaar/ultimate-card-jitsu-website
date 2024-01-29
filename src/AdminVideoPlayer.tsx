import { useContext, useEffect, useState } from "react"
import { PlayerInfo, SocketContext } from "./Context/VideoContext"


export function AdminVideoPlayer(): JSX.Element {
  const { userVideo, startScreensharing, socket, connectAdmin, playerInfo, callUser }:{
    userVideo: any,
    startScreensharing: any,
    socket: any,
    connectAdmin: any,
    playerInfo: PlayerInfo[],
    callUser: (id: string) => void
  } = useContext(SocketContext)  
  const [isConnected, setIsConnected] = useState(false)

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
        {playerInfo.map((player) => {
          return (
            <div>
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