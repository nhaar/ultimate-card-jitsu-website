import { useEffect, useState } from 'react'
import { createTournament, getAllPlayers, isTournamentActive } from './api'

/** Component responsible for the control room when a tournament is not active */
function PretournamentControlRoom (): JSX.Element {
  const [unselectedPlayers, setUnselectedPlayers] = useState<string[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])

  useEffect(() => {
    void (async () => {
      const players = await getAllPlayers()
      setUnselectedPlayers(players)
    })()
  }, [])

  /**
   * Moves a player from unselected to selected
   * @param player 
   */
  function selectPlayer (player: string): void {
    const u = [ ...unselectedPlayers].filter((p) => p !== player)
    setUnselectedPlayers(u)
    setSelectedPlayers([...selectedPlayers, player])
  }

  /**
   * Moves a player from selected to unselected
   * @param player 
   */
  function unselectPlayer (player: string): void {
    const s = [ ...selectedPlayers].filter((p) => p !== player)
    setSelectedPlayers(s)
    setUnselectedPlayers([...unselectedPlayers, player])
  }

  /** Handles clicking for creating a tournament */
  async function handleCreateTournament (): Promise<void> {
    const ok = await createTournament(selectedPlayers)
    window.alert(ok ? 'Tournament created!' : 'Failed to create tournament')
  }

  return (
    <div>
      INACTIVE
      <div>
        UNSELECTED
        {unselectedPlayers.map((player) => (
          <button key={player} onClick={() => selectPlayer(player)}>{player}</button>
        ))}
      </div>
      <div>
        SELECTED
        {selectedPlayers.map((player) => (
          <button key={player} onClick={() => unselectPlayer(player)}>{player}</button>
        ))}
      </div>
      <button onClick={() => { void handleCreateTournament() }}>CREATE TOURNAMENT</button>
    </div>
  )
}

/** Component for the control room of the tournament */
export default function TournamentControlRoom (): JSX.Element {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    void (async () => {
      setIsActive(await isTournamentActive())
    })()
  }, [])

  if (isActive) {
    return (
      <div>Active!</div>
    )
  } else {
    return (
      <PretournamentControlRoom />
    )
  }
}
