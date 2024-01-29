import { useContext, useEffect, useState } from "react"
import { SocketContext } from "./Context/VideoContext"


export function AdminVideoPlayer(): JSX.Element {
  const { userVideo, startScreensharing, socket, connectAdmin } = useContext(SocketContext)  
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
        USER VIDEO
        <video playsInline muted ref={userVideo} autoPlay />
      </div>  
    </div>
  )
}