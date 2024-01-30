import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { SERVER_URL } from './urls'

import './styles/video-styles.css'
import { formatCookies } from './utils'
import VideoPlayer from './VideoPlayer'


/** Component that handles the admin page */
export default function AdminPage (): JSX.Element {
  /** WebSocket connection */
  const [socket, setSocket] = useState<Socket | null>(null)
  
  // connect socket as an admin to receive video chunks
  useEffect(() => {
    const socket = io(SERVER_URL)
    setSocket(socket)

    const token = formatCookies(document.cookie).token
    socket.emit('connectAdmin', { token })
  }, [])

  // currently no way of knowing socket id
  return (
    <div>
      <VideoPlayer socket={socket} socketId='' />
    </div>
  )
}
