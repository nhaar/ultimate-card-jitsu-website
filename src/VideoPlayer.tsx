import { useContext } from "react"
import { SocketContext } from "./Context/VideoContext"


export default function VidePlayer(): JSX.Element {
    const { name, callAccepted, myVideo, userVideo, callEnded, stream, call } = useContext(SocketContext)

    return (
        <div>
            Hello videos!
            <div>
                MY VIDEO
                {stream &&(
                    <video playsInline muted ref={myVideo} autoPlay />
                )}
            </div>
            <div>
                OTHER VIDEO
                {callAccepted && !callEnded && (
                    <video playsInline ref={userVideo} autoPlay />
                )}
            </div>
        </div>
    )
}