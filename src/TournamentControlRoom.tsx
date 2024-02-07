import { useEffect, useState } from 'react'
import { TournamentMatch, TournamentTies, createTournament, getAllPlayers, getTies, getTournamentMatches, isTournamentActive, settleTie, updateMatchScore } from './api'

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

/** A base component used to create a component that requires inputting multiple players to decide the winner of matches */
function ControllerWithDecider<T> ({ Child, childProps, playerCount, runners, updateCallback }: {
  /**
   * The component that will be created base on this one, it must receive the decider element which is used for writing
   * the standings and submitting
   */
  Child: (props: { decider: JSX.Element } & T) => JSX.Element
  /**
   * Props to be passed to the child component, which is of type `T`
   */
  childProps: T
  /** The number of players that will be in the "match" for deciding */
  playerCount: number
  /** The exact player IDs in the match in any order */
  runners: number[]
  /**
   * A callback that will take an array of the runner IDs in the order they placed (index 0 is first place, etc.) and that
   * will be used to update the standings, whathever it may be, returning a boolean indicating if it was successful
   */
  updateCallback: (standings: number[]) => Promise<boolean>
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
    if (players.length !== playerCount) {
      window.alert('Need 4 players')
      return
    }
    for (const player of players) {
      if (player.match(/^\d+$/) === null) {
        window.alert('Player names must be numbers')
        return
      }
      if (runners.find(r => r === Number(player)) === undefined) {
        window.alert('Found player not in match: ' + player)
        return
      }
    }
    const standings = players.map(p => Number(p))
    void (async () => {
      const response = await updateCallback(standings)
      if (response) {
        window.alert('Standings updated')
        window.location.reload()
      } else {
        window.alert('Failed to update standings')
      }
    })()
  }
  const decider = (
    <div>
      <textarea value={standingDecider} onChange={(e) => setStandingDecider(e.target.value)} />
      <button onClick={decideStandings}>DECIDE</button>
    </div>
  )

  return (
    <Child decider={decider} {...childProps} />
  )
}

/** Base component that controls a match's results, to be used with `ControllerWithDecider` */
function TournamentMatchController ({ match, index, decider }: {
  /** Object of match */
  match: TournamentMatch
  /** Index of match (in tournament matches array) */
  index: number
  decider: JSX.Element
}): JSX.Element {
  let matchElement: JSX.Element
  if (match.standings.length === 0) {
    matchElement = (
      <div>
        <div>
          NOT STARTED, BETWEEN {match.runners}
        </div>
        {decider}
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

/** Base component that controls a tie's results, to be used with `ControllerWithDecider` */
function TournamentTieController ({ points, players, decider }: {
  /** The point value that all players are tied at */
  points: number
  /** All the player IDs that are tied */
  players: number[]
  /** See `ControllerWithDecider` */
  decider: JSX.Element
}): JSX.Element {
  return (
    <div>
      <div>
        TIE AT {points} POINTS BETWEEN {players}
      </div>
      {decider}
    </div>
  )
}

/** Component for the control room while the tournament is ongoing */
function ActiveTournamentControlRoom (): JSX.Element {
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [ties, setTies] = useState<TournamentTies | null>(null)

  // to fetch things, means that needs to restart page to see changes
  useEffect(() => {
    void (async () => {
      setMatches(await getTournamentMatches())
      setTies(await getTies())
    })()
  }, [])

  // to display all the pending ties
  const tieComponents = []
  if (ties?.exists === true) {
    for (const points in ties.ties) {
      const players = ties.ties[points]
      tieComponents.push(<ControllerWithDecider<{ points: number, players: number[] }>
        Child={TournamentTieController} childProps={{ players, points: Number(points) }} playerCount={players.length} runners={players} updateCallback={async (standings) => {
          return await settleTie(Number(points), standings)
        }}
                         />)
    }
  }

  return (
    <div>
      {matches.map((match, i) => {
        return (
          <ControllerWithDecider<{ match: TournamentMatch, index: number }>
            key={i} Child={TournamentMatchController} childProps={{ match, index: i }} playerCount={4} runners={match.runners} updateCallback={async (standings) => {
              return await updateMatchScore(i, standings)
            }}
          />
        )
      })}
      <div>
        {tieComponents}
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

  let controlRoomElement = isActive ? <ActiveTournamentControlRoom /> : <PretournamentControlRoom />
  return (
    <div>
      <div>
        Control room intentionally left not user friendly due to time constraints, good luck!
      </div>
      {controlRoomElement}
    </div>
  )
}
