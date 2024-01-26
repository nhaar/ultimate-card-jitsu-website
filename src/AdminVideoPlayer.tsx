import { useContext } from "react"
import { SocketContext } from "./Context/VideoContext"


export function AdminVideoPlayer(): JSX.Element {
  const { userVideo, startScreensharing } = useContext(SocketContext)  
  
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