import { useContext, useState } from "react"
import { SocketContext } from "./Context/VideoContext"

export default function Options(): JSX.Element {
    const { me, callAccepted, name, setName, callEnded, leaveCall, callUser } = useContext(SocketContext)
    const [idToCall, setIdToCall] = useState<string>("")

    return (
        <div>
            Hello options!
            <div>
                Paste name
                <input type="text" value={name} onChange={e => setName(e.target.value)} />
                <div>
                  your id: {me}
                </div>
            </div>
            <div>
                Call ID
                <input type="text" value={idToCall} onChange={e => setIdToCall(e.target.value)} />           
            </div>
            <div>
                {callAccepted && !callEnded ? (
                    <button onClick={leaveCall}>Hang Up</button>
                ) : (
                    <button onClick={() => callUser(idToCall)}>Call</button>
                )}
            </div>
        </div>
    )
}