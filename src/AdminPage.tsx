import { useEffect, useState } from 'react'
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
  const [unqueuedPlayers, setUnqueuedPlayers] = useState<PlayerInfo[]>([])
  const [queuedPlayers, setQueuedPlayerds] = useState<PlayerInfo[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null)

  function updatePlayersInQueue (originalQueue: PlayerInfo[], removedPlayers: PlayerInfo[]): void {
    for (const player of removedPlayers) {
      const index = originalQueue.findIndex((p) => p.id === player.id)
      originalQueue.splice(index, 1)
    }
  }

  // connect socket as an admin to receive video chunks
  useEffect(() => {
    const socket = io(SERVER_URL)
    setSocket(socket)

    const token = formatCookies(document.cookie).token
    socket.emit('connectAdmin', { token })
    socket.on('getPlayers', ({ players: incomingPlayers }: { players: PlayerInfo[] }) => {
      const u = [...unqueuedPlayers]
      const q = [...queuedPlayers]

      const removedPlayers: PlayerInfo[] = []
      for (const player of incomingPlayers) {
        if (players.find((p) => p.id === player.id) == null) {
          u.push(player)
        }
      }
      for (const player of players) {
        if (incomingPlayers.find((p) => p.id === player.id) == null) {
          removedPlayers.push(player)
        }
      }

      updatePlayersInQueue(u, removedPlayers)
      updatePlayersInQueue(q, removedPlayers)
      setUnqueuedPlayers(u)
      setQueuedPlayerds(q)

      if (selectedPlayer !== null && (removedPlayers.find((p) => p.id === selectedPlayer.id) != null)) {
        setSelectedPlayer(null)
      }
      setPlayers(incomingPlayers)
    })
  }, [])

  function addToQueue (id: string): void {
    const u = [...unqueuedPlayers]
    const unqueueIndex = u.findIndex((p) => p.id === id)
    const player = u[unqueueIndex]
    u.splice(unqueueIndex, 1)
    setQueuedPlayerds([...queuedPlayers, player])
    setUnqueuedPlayers(u)
  }

  return (
    <div>
      <div>
        UNQUEUED PLAYERS
        {unqueuedPlayers.map((player) => {
          return (
            <div key={player.id}>
              <button onClick={() => addToQueue(player.id)}>ADD: {player.name}</button>
            </div>
          )
        })}
      </div>
      <div>
        QUEUED PLAYERS
        {queuedPlayers.map((player) => {
          return (
            <div key={player.id}>
              <button onClick={() => setSelectedPlayer(player)}>SELECT: {player.name}</button>
              <VideoPlayer key={player.id} socket={socket} socketId={player.id} />
            </div>
          )
        })}
      </div>
      <VideoPlayer key={selectedPlayer?.id} socket={socket} socketId={selectedPlayer?.id ?? ''} />
    </div>
  )
}
