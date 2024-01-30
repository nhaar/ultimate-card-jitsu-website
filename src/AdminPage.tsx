import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { SERVER_URL } from './urls'

import './styles/video-styles.css'
import { formatCookies } from './utils'
import VideoPlayer from './VideoPlayer'

interface PlayerInfo {
  id: string
  name: string
}

/** Component that handles the admin page */
export default function AdminPage (): JSX.Element {
  /** WebSocket connection */
  const [socket, setSocket] = useState<Socket | null>(null)
  const [players, setPlayers] = useState<PlayerInfo[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  
  // connect socket as an admin to receive video chunks
  useEffect(() => {
    const socket = io(SERVER_URL)
    setSocket(socket)

    const token = formatCookies(document.cookie).token
    socket.emit('connectAdmin', { token })
    socket.on('getPlayers', ({players}) => {
      setPlayers(players as PlayerInfo[])
    })
  }, [])

  return (
    <div>
      <div>
        {players.map((player) => {
          return (
            <div key={player.id}>
              <button onClick={() => setSelectedPlayer(player.id)}>WATCH {player.name}</button>
            </div>
          )
        })}
      </div>
      <VideoPlayer key={selectedPlayer} socket={socket} socketId={selectedPlayer} />
    </div>
  )
}
