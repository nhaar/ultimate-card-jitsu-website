import { createContext, useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

import Peer from 'simple-peer'
import { SERVER_URL } from '../urls'
import { formatCookies } from '../utils'

/** Info that is sent by the backend for each player */
export interface PlayerInfo {
  id: string
}

const SocketContext = createContext<any>(undefined)
function ContextProvider ({ children }: { children: JSX.Element[] | JSX.Element }): JSX.Element {
  const [callAccepted, setCallAccepted] = useState(false)
  const [callEnded, setCallEnded] = useState(false)
  const [stream, setStream] = useState<MediaStream | undefined>(undefined)
  const [name, setName] = useState('')
  const [call, setCall] = useState<{ [key: string]: any }>({})
  const [me, setMe] = useState('')
  const myVideo = useRef<HTMLVideoElement>(null)
  const userVideo = useRef<HTMLVideoElement>(null)
  const connectionRef = useRef<any>(null)
  const [socket, setSocket] = useState<Socket | undefined>(undefined)
  const [playerInfo, setPlayerInfo] = useState<Array<PlayerInfo>>([])

  // use of any for call and connectionRef should be fixed

  useEffect(() => {
    // immediately answer call.
    if (call.isReceivedCall && !callAccepted) {
      answerCall()
    }
  }, [call, callAccepted])

  useEffect(() => {
    const socket = io(SERVER_URL).on('me', (id: string) => setMe(id));

    (socket).on('callUser', ({ from, name: callerName, signal }) => {
      setCall({ isReceivedCall: true, from, name: callerName, signal })
    })

    setSocket(socket)
  }, [])

  function answerCall () {
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
    peer.signal(call.signal)
    connectionRef.current = peer
  }

  function callUser (id: string) {
    const peer = new Peer({ initiator: true, trickle: false, stream })
    peer.on('signal', (data) => {
      socket?.emit('callUser', { userToCall: id, signalData: data, from: me, name })
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

  function leaveCall () {
    setCallEnded(true)
    connectionRef.current.destroy()
    window.location.reload()
  }

  function startScreensharing () {
    navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
    .then((currentStream) => {
      setStream(currentStream)
      if (myVideo.current === null) {
        console.log('myVideo is null')
      } else {
        myVideo.current.srcObject = currentStream
      }
    });
  }

  function connectPlayer() {
    console.log(socket)
    socket?.emit('connectPlayer')
  }

  function connectAdmin() {
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
      name,
      setName,
      callEnded,
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

export { ContextProvider, SocketContext }
