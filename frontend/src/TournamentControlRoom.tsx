import { useContext, useEffect, useState } from 'react'
import { TournamentMatch, TournamentTies, createTournament, deleteTournament, getAllPlayers, getPlayerInfo, getTies, getTournamentMatches, isTournamentActive, resetTournamentDate, rollbackTournament, setTournamentDate, settleTie, updateMatchScore } from './api'
import { PlayerInfoContext } from './context/PlayerInfoContext'
import { Socket, io } from 'socket.io-client'
import config from './config.json'
import { getCookie } from './utils'
import { TournamentUpdate, TournamentUpdateContext } from './context/TournamentContext'

/** Component responsible for the control room when a tournament is not active */
function PretournamentControlRoom(): JSX.Element {
  /** Value that will be used for the tournament date */
  const [date, setDate] = useState<string>('')
  const [unselectedPlayers, setUnselectedPlayers] = useState<string[]>([])
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const sendUpdate = useContext(TournamentUpdateContext)

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
  function selectPlayer(player: string): void {
    const u = [...unselectedPlayers].filter((p) => p !== player)
    setUnselectedPlayers(u)
    setSelectedPlayers([...selectedPlayers, player])
  }

  /**
   * Moves a player from selected to unselected
   * @param player
   */
  function unselectPlayer(player: string): void {
    const s = [...selectedPlayers].filter((p) => p !== player)
    setSelectedPlayers(s)
    setUnselectedPlayers([...unselectedPlayers, player])
  }

  /** Handles clicking for creating a tournament */
  async function handleCreateTournament(): Promise<void> {
    const ok = await createTournament(selectedPlayers)
    window.alert(ok ? 'Tournament created!' : 'Failed to create tournament')
    if (ok) {
      sendUpdate({ updateState: true, playerInfo: true })
      window.location.reload()
    }
  }

  /** Handle click to set the date */
  function changeDate(): void {
    void (async () => {
      await setTournamentDate(new Date(date))
      sendUpdate({ updateDate: true })
    })()
  }

  /** Handle click to remove the date */
  function removeDate(): void {
    void (async () => {
      await resetTournamentDate()
      sendUpdate({ updateDate: true })
    })()
  }

  return (
    <div style={{ padding: '2%' }}>
      <span style={{
        fontSize: '24pt',
        color: '#FFF'
      }}
        className="burbank">DATE CHANGE</span><br />
      <input type='datetime-local' value={date} onChange={(e) => setDate(e.target.value)} /><br /><br />
      <button className='button' style={{ marginRight: '1%' }} onClick={changeDate}>SET DATE</button>
      <button className='button is-danger' onClick={removeDate}>REMOVE DATE</button><br /><br />
      <div>
        <span style={{
          fontSize: '14pt',
          color: '#FFF',
          marginRight: '1%',
          verticalAlign: 'middle'
        }}
          className="burbank">UNSELECTED</span>
        {unselectedPlayers.map((player) => (
          <button className='button' key={player} onClick={() => selectPlayer(player)}>{player}</button>
        ))}
      </div><br />
      <div>
        <span style={{
          fontSize: '14pt',
          color: '#FFF',
          marginRight: '1%',
          verticalAlign: 'middle'
        }}
          className="burbank">SELECTED</span>
        {selectedPlayers.map((player) => (
          <button className='button' key={player} onClick={() => unselectPlayer(player)}>{player}</button>
        ))}
      </div><br /><br />
      <button className='button' onClick={() => { void handleCreateTournament() }}>CREATE TOURNAMENT</button>
    </div>
  )
}

/** A base component used to create a component that requires inputting multiple players to decide the winner of matches */
function ControllerWithDecider<T>({ Child, childProps, playerCount, runners, updateCallback }: {
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
  const sendUpdate = useContext(TournamentUpdateContext)

  /**
   * Takes the given players in string and parses and updates the match standings based on it
   * @param matchIndex
   * @returns
   */
  function decideStandings(): void {
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
        sendUpdate({ scoreUpdate: true })
      } else {
        window.alert('Failed to update standings')
      }
    })()
  }
  const decider = (
    <div>
      <textarea value={standingDecider} onChange={(e) => setStandingDecider(e.target.value)} />
      <button className="button" style={{ marginLeft: '1%' }} onClick={decideStandings}>DECIDE</button>
    </div>
  )

  return (
    <Child decider={decider} {...childProps} />
  )
}

/**
 * Helper function used to list all players in a "decision" such that it is easier to read and understand
 * @param players Array with player IDs
 * @param playerInfo Player info object from the context
 */
function listAllPlayers(players: number[], playerInfo: { [id: number]: string }): string {
  const labeledPlayers = players.map(p => `${p} - ${playerInfo[p]}`)
  return labeledPlayers.join('||||')
}

/** Base component that controls a match's results, to be used with `ControllerWithDecider` */
function TournamentMatchController({ match, index, decider }: {
  /** Object of match */
  match: TournamentMatch
  /** Index of match (in tournament matches array) */
  index: number
  decider: JSX.Element
}): JSX.Element {
  const playerInfo = useContext(PlayerInfoContext)

  const players = []
  let hasNull = false
  for (const player of match.runners) {
    if (player === null) {
      hasNull = true
      break
    } else {
      players.push(player)
    }
  }

  let matchElement: JSX.Element
  var matchPlayers = listAllPlayers(players, playerInfo).split('||||')
  if (hasNull) {
    throw new Error('Match has null player, should have been filtered')
  }
  if (match.standings.length === 0) {
    matchElement = (
      <div>
        <div className="burbank">
          NOT STARTED
        </div>
        <div style={{ width: '5%' }}>
          <TournamentMatchElement player1={matchPlayers[0]} player2={matchPlayers[1]} player3={matchPlayers[2]} player4={matchPlayers[3]} />
        </div><br />
        {decider}<br />
      </div>
    )
  } else {
    matchElement = <div className="burbank">FINISHED</div>
  }

  return (
    <div>
      <div className="burbank" style={{ fontSize: '18pt' }}>
        MATCH {index + 1}
      </div>
      {matchElement}
    </div>
  )
}

/** Base component that controls a tie's results, to be used with `ControllerWithDecider` */
function TournamentTieController({ points, players, decider }: {
  /** The point value that all players are tied at */
  points: number
  /** All the player IDs that are tied */
  players: number[]
  /** See `ControllerWithDecider` */
  decider: JSX.Element
}): JSX.Element {
  const playerInfo = useContext(PlayerInfoContext)

  return (
    <div>
      <div className="burbank">
        TIE AT {points} POINTS BETWEEN {listAllPlayers(players, playerInfo)}
      </div>
      {decider}
    </div>
  )
}

/** Component that renders a match's players */
function TournamentMatchElement({ player1, player2, player3, player4 }: { player1: string, player2: string, player3: string, player4: string }): JSX.Element {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      width: '80%',
      textAlign: 'center',
      textShadow: '2px 2px 2px #000, -2px 2px 2px #000, -2px -2px 2px #000, 2px -2px 2px #000'
    }} className="burbank"
    >
      <div />
      <div>{player1}</div>
      <div />
      <div>{player2}</div>
      <div className='candombe emblem-yellow' style={{ textShadow: '2px 2px 2px #000, -2px 2px 2px #000, -2px -2px 2px #000, 2px -2px 2px #000', verticalAlign: 'middle', fontSize: '24pt' }}>VS</div>
      <div>{player3}</div>
      <div />
      <div>{player4}</div>
      <div />
    </div>
  )
}

/** Component for the control room while the tournament is ongoing */
function ActiveTournamentControlRoom(): JSX.Element {
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [ties, setTies] = useState<TournamentTies | null>(null)
  const [playerInfo, setPlayerInfo] = useState<{ [id: number]: string }>({})
  const sendUpdate = useContext(TournamentUpdateContext)

  // to fetch things, means that needs to restart page to see changes
  useEffect(() => {
    void (async () => {
      setMatches(await getTournamentMatches())
      setTies(await getTies())
      setPlayerInfo(await getPlayerInfo())
    })()
  }, [])

  // to display all the pending ties
  const tieComponents = []
  if (ties?.exists === true) {
    for (const points in ties.ties) {
      const players = ties.ties[points]
      if (players.length !== 0) {
        tieComponents.push(<ControllerWithDecider<{ points: number, players: number[] }>
          Child={TournamentTieController} childProps={{ players, points: Number(points) }} playerCount={players.length} runners={players} updateCallback={async (standings) => {
            return await settleTie(Number(points), standings)
          }}
        />)
      } else {
        continue
      }
    }
  }

  /** Handle clicking to rollback the tournament */
  function clickRollbackTournament(): void {
    void (async () => {
      const ok = await rollbackTournament()
      if (ok) {
        window.location.reload()
        sendUpdate({ updateAll: true })
      } else {
        window.alert('Failed to roll back tournament')
      }
    })()
  }

  /** Handle clicking to delete the tournament */
  function clickDeleteTournament(): void {
    const confirm = window.confirm('Are you sure you want to delete the tournament?')
    if (confirm) {
      void (async () => {
        await deleteTournament()
        await resetTournamentDate()
        sendUpdate({ updateState: true })
      })()
    }
  }

  return (
    <div style={{ padding: '2%' }}>
      <PlayerInfoContext.Provider value={playerInfo}>
        <button className="button" onClick={clickRollbackTournament}>
          UNDO (rollback tournament)
        </button>
        <button style={{ marginLeft: '1%' }} className='button is-danger' onClick={clickDeleteTournament}>
          DELETE TOURNAMENT
        </button><br /><br />
        {matches.map((match, i) => {
          const players = []
          let hasNull = false
          for (const player of match.runners) {
            if (player === null) {
              hasNull = true
              break
            } else {
              players.push(player)
            }
          }

          if (hasNull) {
            return undefined
          }

          return (
            <ControllerWithDecider<{ match: TournamentMatch, index: number }>
              key={i} Child={TournamentMatchController} childProps={{ match, index: i }} playerCount={4} runners={players} updateCallback={async (standings) => {
                return await updateMatchScore(i, standings)
              }}
            />
          )
        })}
        <div>
          <br/><br/><br/>
          {tieComponents}
        </div>
      </PlayerInfoContext.Provider>
    </div>
  )
}

/** Component for the control room of the tournament */
export default function TournamentControlRoom(): JSX.Element {
  const [isActive, setIsActive] = useState(false)
  const [socket, setSocket] = useState<Socket | null>(null)

  useEffect(() => {
    void (async () => {
      setIsActive(await isTournamentActive())
    })()

    // set up socket so that we can send tournmanet updates
    const socket = io(config.SERVER_URL)

    // to authenticate this user as an updater
    socket.emit('connectUpdater', { token: getCookie('token') })

    setSocket(socket)
  }, [])

  /** Takes an update object and sends it to the WebSocket so that it can update data for all users. */
  function sendUpdate(update: TournamentUpdate): void {
    if (socket === null) {
      throw new Error('Socket is null')
    }
    socket.emit('updateTournament', update)
  }

  const controlRoomElement = isActive ? <ActiveTournamentControlRoom /> : <PretournamentControlRoom />
  return (
    <TournamentUpdateContext.Provider value={sendUpdate}>
      <div className='has-text-primary'>
        {controlRoomElement}
      </div>
    </TournamentUpdateContext.Provider>
  )
}
