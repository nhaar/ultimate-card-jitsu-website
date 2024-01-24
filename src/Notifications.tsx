import { useContext } from "react"
import { SocketContext } from "./Context/VideoContext"

export default function Notifications(): JSX.Element {
    const { answerCall, call, callAccepted } = useContext(SocketContext)

    return (
        <div>
            Hello notifications!
            {call.isReceivedCall && !callAccepted && (
                <div>
                    RAHA RINGTONE PICK UP YOUR PHONE
                    <button onClick={answerCall}>Answer</button>
                </div>
            )}
        </div>
    )
}