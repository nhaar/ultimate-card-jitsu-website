import { useContext } from 'react'
import { SocketContext } from './Context/VideoContext'

export default function VidePlayer (): JSX.Element {
  const { myVideo, startScreensharing, userVideo } = useContext(SocketContext)

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
