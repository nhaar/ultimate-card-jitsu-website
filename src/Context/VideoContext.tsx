import { createContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

import Peer from 'simple-peer'
import { SERVER_URL } from '../urls'
import { formatCookies } from '../utils'

/** Info that is sent by the backend for each player */
export interface PlayerInfo {
  id: string
}

/** Info from incoming call */
interface CallInfo {
  /** Whether or not is currently receiving a call */
  isReceivedCall: boolean
  /** Id of caller */
  from?: string
  /** Signal of the call being received, if any */
  signal?: Peer.SignalData
}

/** Stores all important variables for using the websocket and RTC */
const SocketContext = createContext<any>(undefined)

/**
 * An element that wraps any children in the context for using the websocket and RTC
 */
function SocketContextProvider ({ children }: { children: JSX.Element[] | JSX.Element }): JSX.Element {
  /** Whether or not have accepted to be in a call */
  const [callAccepted, setCallAccepted] = useState(false)

  /** The media stream with the content to be shared, or undefined if not capturing */
  // TO-DO: Must watch edge cases for when stream is undefined
  const [stream, setStream] = useState<MediaStream | undefined>(undefined)

  /** To receive incoming calls */
  const [call, setCall] = useState<CallInfo>({ isReceivedCall: false })

  /** Id of the socket */
  const [me, setMe] = useState('')

  /** Reference to a video element that will store one's own video (used for users) */
  const myVideo = useRef<HTMLVideoElement>(null)

  /** Reference to a video element that will store another's video (used for admins) */
  const userVideo = useRef<HTMLVideoElement>(null)

  /** Reference to peer handling the current connection */
  const connectionRef = useRef<Peer.Instance | null>(null)

  /** Socket connection, or undefined if none */
  const [socket, setSocket] = useState<Socket | undefined>(undefined)

  /** All player info received from backend, if is an admin */
  const [playerInfo, setPlayerInfo] = useState<PlayerInfo[]>([])

  /** This effect handles automatically answering received calls */
  useEffect(() => {
    // immediately answer call.
    if (call.isReceivedCall && !callAccepted) {
      answerCall()
    }
  }, [call, callAccepted])

  /** This effect automatically connects to the websocket */
  useEffect(() => {
    const socket = io(SERVER_URL).on('me', (id: string) => setMe(id))
    setSocket(socket)

    /** When receiving a call from the websocket */
    socket?.on('callUser', ({ from, signal }) => {
      setCall({ isReceivedCall: true, from, signal })
    })
  }, [])

  /** Answers an incoming call and starts receiving/sending data */
  function answerCall (): void {
    setCallAccepted(true)
    const peer = new Peer({ initiator: false, trickle: false, stream })
    peer.on('signal', (data) => {
      socket?.emit('answerCall', { signal: data, to: call.from })
    })
    peer.on('stream', (currentStream) => {
      if (userVideo.current === null) {
        console.log('userVideo is null')
      } else {
        userVideo.current.srcObject = currentStream
      }
    })
    if (call.signal === undefined) {
      console.log('call.signal is undefined')
    } else {
      peer.signal(call.signal)
    }
    connectionRef.current = peer
  }

  /**
   * Call an user from the websocket
   * @param id User's socket ID
   */
  function callUser (id: string): void {
    const peer = new Peer({ initiator: true, trickle: false, stream })
    peer.on('signal', (data) => {
      socket?.emit('callUser', { userToCall: id, signalData: data, from: me })
    })
    peer.on('stream', (currentStream) => {
      if (userVideo.current === null) {
        console.log('userVideo is null')
      } else {
        userVideo.current.srcObject = currentStream
      }
    })
    socket?.on('callAccepted', (signal) => {
      setCallAccepted(true)
      peer.signal(signal)
    })
    connectionRef.current = peer
  }

  /** Leave the current call */
  function leaveCall (): void {
    if (connectionRef.current !== null) {
      connectionRef.current.destroy()
    }
    window.location.reload()
  }

  /** To save screenshare data as a stream */
  function startScreensharing (): void {
    void navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream)
        if (myVideo.current === null) {
          console.log('myVideo is null')
        } else {
          myVideo.current.srcObject = currentStream
        }
      })
  }

  /** Connects a player to the screensharing queue */
  function connectPlayer (): void {
    socket?.emit('connectPlayer')
  }

  /** Connects an admin to the screensharing queue */
  function connectAdmin (): void {
    const token = formatCookies(document.cookie).token
    socket?.on('getPlayers', (data: { players: PlayerInfo[] }) => {
      setPlayerInfo(data.players)
    })
    socket?.emit('connectAdmin', { token })
  }

  return (
    <SocketContext.Provider value={{
      call,
      callAccepted,
      myVideo,
      userVideo,
      stream,
      me,
      callUser,
      leaveCall,
      answerCall,
      setStream,
      startScreensharing,
      connectPlayer,
      connectAdmin,
      socket,
      playerInfo
    }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export { SocketContextProvider, SocketContext }
