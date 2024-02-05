import { useEffect, useState } from 'react'
import { TournamentMatch, createTournament, getAllPlayers, getTournamentMatches, isTournamentActive, updateMatchScore } from './api'

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
    const u = [...unselectedPlayers].filter((p) => p !== player)
    setUnselectedPlayers(u)
    setSelectedPlayers([...selectedPlayers, player])
  }

  /**
   * Moves a player from selected to unselected
   * @param player
   */
  function unselectPlayer (player: string): void {
    const s = [...selectedPlayers].filter((p) => p !== player)
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

/** Component that controls a match */
function TournamentMatchController ({ match, index }: {
  /** Object of match */
  match: TournamentMatch
  /** Index of match (in tournament matches array) */
  index: number
}): JSX.Element {
  /**
   * If not decided, will be used to parse the standings
   *
   * The string is expected to be a list of numbers separated by newlines, with all numbers being the runner IDs
   * */
  const [standingDecider, setStandingDecider] = useState('')

  /**
   * Takes the given players in string and parses and updates the match standings based on it
   * @param matchIndex
   * @returns
   */
  function decideStandings (): void {
    const players = standingDecider.split('\n').filter((p) => p.trim() !== '')
    if (players.length !== 4) {
      window.alert('Need 4 players')
      return
    }
    for (const player of players) {
      if (player.match(/^\d+$/) === null) {
        window.alert('Player names must be numbers')
        return
      }
      if (match.runners.find(r => r === Number(player)) === undefined) {
        window.alert('Found player not in match: ' + player)
        return
      }
    }
    const standings = players.map(p => Number(p))
    void (async () => {
      const response = await updateMatchScore(index, standings)
      if (response) {
        window.alert('Standings updated')
        window.location.reload()
      } else {
        window.alert('Failed to update standings')
      }
    })()
  }

  let matchElement: JSX.Element
  if (match.standings.length === 0) {
    matchElement = (
      <div>
        <div>
          NOT STARTED, BETWEEN {match.runners}
        </div>
        <textarea value={standingDecider} onChange={(e) => setStandingDecider(e.target.value)} />
        <button onClick={decideStandings}>DECIDE</button>
      </div>
    )
  } else {
    matchElement = <div>FINISHED</div>
  }

  return (
    <div>
      <div>
        MATCH {index}
      </div>
      {matchElement}
    </div>
  )
}

/** Component for the control room while the tournament is ongoing */
function ActiveTournamentControlRoom (): JSX.Element {
  const [matches, setMatches] = useState<TournamentMatch[]>([])

  useEffect(() => {
    void (async () => {
      setMatches(await getTournamentMatches())
    })()
  }, [])

  return (
    <div>
      Hello Tournamenters
      {matches.map((match, i) => {
        return (
          <TournamentMatchController key={i} match={match} index={i} />
        )
      })}
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
      <ActiveTournamentControlRoom />
    )
  } else {
    return (
      <PretournamentControlRoom />
    )
  }
}
