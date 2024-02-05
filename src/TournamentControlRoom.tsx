import { useEffect, useState } from "react"
import { getAllPlayers, isTournamentActive } from "./api"

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

  return (
    <div>
      INACTIVE
      <div>
        UNSELECTED
        {unselectedPlayers.map((player) => (
          <div>{player}</div>
        ))}        
      </div>
      <div>
        SELECTED
        {selectedPlayers.map((player) => (
          <div>{player}</div>
        ))}
    </div>
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