import { useContext, useEffect, useState } from 'react'
import { TournamentMatch, TournamentTies, createFireTournament, createNormalTournament, deleteTournament, getAllPlayers, getPlayerInfo, getTies, getTournamentMatches, isTournamentActive, resetTournamentDate, rollbackTournament, setTournamentDate, settleTie, updateMatchScore } from './api'
import { PlayerInfoContext } from './context/PlayerInfoContext'
import { getCookie } from './utils'
import { TournamentUpdate, TournamentUpdateContext } from './context/TournamentContext'
import { TournamentMatchElement } from './MainPage'
import { UcjWS } from './ws'
import { WebsiteThemes, getWebsiteTheme } from './website-theme'

/** Component responsible for the control room when a tournament is not active */
function PretournamentControlRoom (): JSX.Element {
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

  /**
   * Move a player up or down (going up means close to beginning)
   * @param index Index of the player
   * @param isUp `true` if moving up, `false` if moving down
   */
  function movePlayer (index: number, isUp: boolean): void {
    const s = [...selectedPlayers]
    const player = s.splice(index, 1)[0]
    const indexDelta = isUp ? -1 : 1
    s.splice(index + indexDelta, 0, player)
    setSelectedPlayers(s)
  }

  /**
   * Moves a player up
   * @param index Index of the player
   */
  function movePlayerUp (index: number): void {
    if (index === 0) {
      return
    }
    movePlayer(index, true)
  }

  /**
   * Moves a player down
   * @param index Index of the player
   */
  function movePlayerDown (index: number): void {
    if (index === selectedPlayers.length - 1) {
      return
    }
    movePlayer(index, false)
  }

  /** Handles clicking for creating a tournament */
  async function handleCreateTournament (): Promise<void> {
    let ok = false
    switch (getWebsiteTheme()) {
      case WebsiteThemes.Fire:
        ok = await createFireTournament(selectedPlayers)
        break
      case WebsiteThemes.Normal:
        ok = await createNormalTournament(selectedPlayers)
        break
      default:
        throw new Error('Not implemented')
    }

    window.alert(ok ? 'Tournament created!' : 'Failed to create tournament')
    if (ok) {
      sendUpdate({ updateState: true, playerInfo: true })
      window.location.reload()
    }
  }

  /** Handle click to set the date */
  function changeDate (): void {
    void (async () => {
      await setTournamentDate(new Date(date))
      sendUpdate({ updateDate: true })
    })()
  }

  /** Handle click to remove the date */
  function removeDate (): void {
    void (async () => {
      await resetTournamentDate()
      sendUpdate({ updateDate: true })
    })()
  }

  return (
    <div style={{ padding: '2%' }}>
      <span
        style={{
          fontSize: '24pt',
          color: '#FFF'
        }}
        className='burbank black-shadow'
      >DATE CHANGE
      </span><br />
      <input className='input burbank' style={{ width: 'fit-content' }} type='datetime-local' value={date} onChange={(e) => setDate(e.target.value)} /><br /><br />
      <button className='button burbank' style={{ marginRight: '1%' }} onClick={changeDate}>SET DATE</button>
      <button className='button is-danger burbank' onClick={removeDate}>REMOVE DATE</button><br /><br />
      <div>
        <span
          className='burbank black-shadow' style={{
            fontSize: '14pt',
            color: '#FFF',
            marginRight: '1%',
            verticalAlign: 'middle'
          }}
        >UNSELECTED
        </span>
        {unselectedPlayers.map((player) => (
          <button className='button burbank' key={player} onClick={() => selectPlayer(player)}>{player}</button>
        ))}
      </div><br />
      <div className='is-flex is-flex-direction-column '>
        <span
          className='burbank black-shadow' style={{
            fontSize: '14pt',
            color: '#FFF',
            marginRight: '1%',
            verticalAlign: 'middle'
          }}
        >SELECTED
        </span>
        <div style={{
          backgroundColor: 'black'
        }}
        >
          This here allows to move the players, used for seeding. Seeding is only important for REGULAR CARD-JITSU
        </div>
        {selectedPlayers.map((player, i) => {
          const moveWidthStyle: React.CSSProperties = {
            width: '100px'
          }
          const moveUpText = i === 0 ? '' : 'MOVE UP'
          const moveDownText = i === selectedPlayers.length - 1 ? '' : 'MOVE DOWN'
          return (
            <div key={i}>
              <span style={{
                color: 'black'
              }}
              ># {i + 1}
              </span>
              <button className='button burbank' onClick={() => movePlayerUp(i)} style={moveWidthStyle}>{moveUpText}</button>
              <button className='button burbank' onClick={() => movePlayerDown(i)} style={moveWidthStyle}>{moveDownText}</button>
              <button className='button burbank' onClick={() => unselectPlayer(player)}>{player}</button>
            </div>
          )
        })}
      </div><br /><br />
      <button className='button burbank' onClick={() => { void handleCreateTournament() }}>CREATE TOURNAMENT</button>
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
  const sendUpdate = useContext(TournamentUpdateContext)

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
        // update state is for the end of the tournament, so might be refactorable
        sendUpdate({ updateState: true, scoreUpdate: true })
      } else {
        window.alert('Failed to update standings')
      }
    })()
  }
  const decider = (
    <div>
      <textarea className='input burbank' style={{ width: 'fit-content', height: '19vh' }} placeholder='Input player IDs in descending order of placement, press enter after each player' value={standingDecider} onChange={(e) => setStandingDecider(e.target.value)} />
      <button className='button burbank' style={{ marginLeft: '1%' }} onClick={decideStandings}>DECIDE</button>
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
function listAllPlayers (players: number[], playerInfo: { [id: number]: string }): string {
  return players.map(p => `${p} - ${playerInfo[p]}`).join('||||')
}

/** Base component that controls a match's results, to be used with `ControllerWithDecider` */
function TournamentMatchController ({ match, index, decider }: {
  /** Object of match */
  match: TournamentMatch
  /** Index of match (in tournament matches array) */
  index: number
  decider: JSX.Element
}): JSX.Element {
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
  if (hasNull) {
    throw new Error('Match has null player, should have been filtered')
  }
  if (match.standings.length === 0) {
    matchElement = (
      <div>
        <div className='burbank black-shadow'>
          NOT STARTED
        </div>
        <div style={{ width: '5%' }}>
          <TournamentMatchElement match={match} displayId />
        </div><br />
        {decider}<br /><br />
      </div>
    )
  } else {
    matchElement = <div><div className='burbank black-shadow'>FINISHED</div><br /></div>
  }

  return (
    <div>
      <div className='burbank black-shadow' style={{ fontSize: '18pt' }}>
        MATCH {index + 1}
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
  const playerInfo = useContext(PlayerInfoContext)

  return (
    <div>
      <div className='burbank black-shadow'>
        TIE AT {points} POINTS BETWEEN {listAllPlayers(players, playerInfo)}
      </div>
      {decider}
    </div>
  )
}

/** Component for the control room while the tournament is ongoing */
function ActiveTournamentControlRoom (): JSX.Element {
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
  function clickRollbackTournament (): void {
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
  function clickDeleteTournament (): void {
    const confirm = window.confirm('Are you sure you want to delete the tournament?')
    if (confirm) {
      void (async () => {
        await deleteTournament()
        await resetTournamentDate()
        sendUpdate({ updateState: true })
        window.location.reload()
      })()
    }
  }

  return (
    <div style={{ padding: '2%' }}>
      <PlayerInfoContext.Provider value={playerInfo}>
        <button className='button burbank' onClick={clickRollbackTournament}>
          UNDO (rollback tournament)
        </button>
        <button style={{ marginLeft: '1%' }} className='button is-danger burbank' onClick={clickDeleteTournament}>
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
          <br /><br /><br />
          {tieComponents}
        </div>
      </PlayerInfoContext.Provider>
    </div>
  )
}

/** Component for the control room of the tournament */
export default function TournamentControlRoom (): JSX.Element {
  const [isActive, setIsActive] = useState(false)
  const [socket] = useState<UcjWS>(() => {
    // set up socket so that we can send tournament updates
    const socket = new UcjWS()

    socket.onOpen(() => {
      // to authenticate this user as an updater
      socket.send('connect-updater', getCookie('token'))
    })

    return socket
  })

  useEffect(() => {
    void (async () => {
      setIsActive(await isTournamentActive())
    })()
  }, [])

  /** Takes an update object and sends it to the WebSocket so that it can update data for all users. */
  function sendUpdate (update: TournamentUpdate): void {
    if (socket === null) {
      throw new Error('Socket is null')
    }
    socket.send('update-tournament', update)
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
