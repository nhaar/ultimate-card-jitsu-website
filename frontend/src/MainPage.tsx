import { useContext, useEffect, useRef, useState } from 'react'

import config from './config.json'
import { FinalStandings, NormalTournamentMatch, Ranking, TournamentPhase, getNormalTournament, getPlayerInfo, getRankings, getTournamentDate, getTournamentFinalStandings, getUpcomingMatchups, isCurrentPhaseFirstPhase, isTournamentActive, isTournamentFinished, UpcomingMatchup, NormalTournament } from './api'
import Haiku from './Haiku'
import { FireTournamentContext, NormalTournamentContext, TournamentContext, TournamentState } from './context/TournamentContext'
import CountdownTimer from './CountdownTimer'
import { PlayerInfoContext } from './context/PlayerInfoContext'
import { getOrdinalNumber } from './utils'
import { UcjWS } from './ws'
import { WebsiteThemes, getWebsiteTheme } from './website-theme'

/**
 * Adds a twitch embed with an element that has the given HTML id
 */
function addTwitchEmbed (elementId: string): void {
  if (config.STREAM_CHANNEL !== undefined) {
    // loaded from script
    const Twitch = (window as any).Twitch;

    // for dev server, need to clear the element first
    (document.getElementById(elementId) as HTMLElement).innerHTML = ''

    // can't do anything about this warning since using new is how the Twitch docs tell you to do it
    /* eslint-disable no-new */
    new Twitch.Embed(elementId, {
      width: 854,
      height: 480,
      channel: config.STREAM_CHANNEL
    })
    /* eslint-disable no-new */
  }
}

/** Component that creates the widget for the Discord server */
function DiscordWidget (): JSX.Element {
  if (config.DISCORD_WIDGET !== undefined) {
    return (
      <iframe src={`https://discord.com/widget?id=${config.DISCORD_WIDGET}&theme=dark`} width='350' height='500' sandbox='allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts' />
    )
  } else {
    return <div />
  }
}

/** Component for the page before the tournament starts */
function PreTournamentPage (): JSX.Element {
  const tournamentDate = useContext(TournamentContext).date
  const now = new Date()

  let dateAnnouncement: JSX.Element
  const firstHaikuLine = 'The elements sleep...'

  if (tournamentDate === undefined) {
    dateAnnouncement = <Haiku first={firstHaikuLine} second='And asking for the server...' third='No results are found!' />
  } else if (tournamentDate === null) {
    dateAnnouncement = <Haiku first={firstHaikuLine} second='The future is foggy now,' third='Unknown is the date.' />
  } else if (tournamentDate.getTime() >= now.getTime()) {
    // this part here will update once the time hits 0 by virtue of the countdown component
    dateAnnouncement = <Haiku first={firstHaikuLine} second="But now they're awakening," third='Soon it will begin...' />
  } else {
    // this part is for if the tournament hasn't begun, but the time has passed over
    // I feel like the second line might be a bit misleading but can't think of a replacement ATM
    dateAnnouncement = <Haiku first='The elements wake...' second='The tournament has begun!' third='Ninjas, it is time...' />
  }

  const dateValueElement = tournamentDate === null || tournamentDate === undefined
    ? <div />
    : (
      <div>
        <div
          className='mt-3' style={{
            textAlign: 'center',
            color: '#c35617',
            fontSize: '72px'
          }}
        >{tournamentDate.toLocaleString()}
        </div>
        <CountdownTimer targetDate={tournamentDate} />
      </div>
      )

  const isDateDecided = tournamentDate !== undefined && tournamentDate !== null

  useEffect(() => {
    if (isDateDecided) {
      addTwitchEmbed('twitch-embed')
    }
  }, [tournamentDate])

  return (
    <div
      className='has-text-primary burbank' style={{
        fontFamily: '',
        width: '100%',
        fontSize: '42px'
      }}
    >
      <div className='is-flex is-justify-content-center my-3 is-flex-direction-column black-shadow'>
        {dateAnnouncement}
        {dateValueElement}
      </div>
      <div className='is-flex is-justify-content-center is-flex-direction-column mt-6'>
        <Haiku first='Place to go exists,' second='with power ninjas must know:' third='Power of friendship' />
        <div className='is-flex is-justify-content-center mt-3 mb-3'>
          <DiscordWidget />
        </div>

        <div>
          {isDateDecided && <Haiku first='Attention is key' second='Maybe already started' third='This will reveal it' />}
          <div className='is-flex is-justify-content-center'>
            <div id='twitch-embed' />
          </div>
        </div>
      </div>
    </div>
  )
}

/** Component for the "waiting tournament to start but stream should be on" page */
function WaitingStartPage (): JSX.Element {
  useEffect(() => {
    addTwitchEmbed('twitch-embed')
  }, [])

  return (
    <div>
      <div
        className='has-text-primary burbank' style={{
          fontSize: '32px'
        }}
      >
        <Haiku first='Transmission begins !' second='Soon the battle unravels !' third='Join us in waiting !' />
      </div>
      <div className='is-flex is-justify-content-center mb-5'>
        <div id='twitch-embed' />
      </div>
    </div>
  )
}

/** Component that handles rendering a table with rankings from an input ranking object from the backend */
function TournamentRanking ({ ranking }: { ranking: Ranking }): JSX.Element {
  const { playerInfo } = useContext(TournamentContext)

  const tableRows = []
  let rank = 1
  for (const pointRanking of ranking) {
    // "freezing" the rank will give the effect of having the same rank for players with the same points, and then incrementing the rank for the next player, as is desired
    const thisRank = rank
    for (const player of pointRanking) {
      tableRows.push(
        <tr key={player.player}>
          <th>{thisRank}</th>
          <td>{playerInfo[player.player]}</td>
          <td>{player.points}</td>
          <td>{player.firstPlace}</td>
          <td>{player.secondPlace}</td>
          <td>{player.thirdPlace}</td>
          <td>{player.fourthPlace}</td>
        </tr>
      )
      rank++
    }
  }

  return (
    <table className='table is-bordered is-striped is-narrow is-hoverable'>
      <thead>
        <tr>
          <th />
          <th>Ninja</th>
          <th>Points</th>
          <th>1st Places</th>
          <th>2nd Places</th>
          <th>3rd Places</th>
          <th>4th Places</th>
        </tr>
      </thead>
      <tbody>
        {tableRows}
      </tbody>
    </table>
  )
}

/** Component that displays rankings for a phase */
function PhaseRankings ({ ranking, third, title, subtitle }: {
  /** Ranking object, from the backend */
  ranking: Ranking
  /** The ranking was built to have a haiku with the first two lines set, this defines the third one */
  third: string
  /** Title to display for the phase */
  title: string
  /** Smaller message to display */
  subtitle: string
}): JSX.Element {
  return (
    <div>
      <div
        className='mb-4' style={{
          fontSize: '24px'
        }}
      >
        <Haiku first='Tournament in phases' second='With a start and a final' third={third} />
      </div>
      <div
        className='black-shadow' style={{
          textAlign: 'center',
          fontSize: '32px'
        }}
      >
        {title}
      </div>
      <div
        className='mb-1 black-shadow' style={{
          textAlign: 'center',
          fontSize: '18px'
        }}
      >
        {subtitle}
      </div>
      <TournamentRanking ranking={ranking} />
    </div>
  )
}

/** Component for the rankings in the first phase */
function FirstPhaseRankings ({ ranking }: { ranking: Ranking }): JSX.Element {
  return <PhaseRankings ranking={ranking} third='But now it begins.' title='Start Phase' subtitle='This is the first phase. The top 4 ninjas will proceed to the finals.' />
}

/** Component for the rankings in the second phase */
function FinalPhaseRankings ({ ranking }: { ranking: Ranking }): JSX.Element {
  return <PhaseRankings ranking={ranking} third='And now is the end.' title='Finals' subtitle='In the finals, only the number one ranked ninja will be victorious.' />
}

/** Component that renders a match's players */
export function TournamentMatchElement ({ match, displayId }: { match: UpcomingMatchup, displayId?: boolean }): JSX.Element {
  const playerInfo = useContext(PlayerInfoContext)

  let players = match.players.map((p) => {
    if (typeof p === 'number') {
      return playerInfo[p]
    } else {
      return p
    }
  })
  if (match.players.length !== 4) {
    players = ['', players[0], players[1], '']
  }

  return (
    <div
      className='black-shadow-2' style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        width: '80%',
        textAlign: 'center'
      }}
    >
      <div />
      <div>{players[0]}</div>
      <div />
      <div>{players[1]}</div>
      <div className='candombe emblem-yellow black-shadow-1' style={{ fontSize: '12pt' }}>VS</div>
      <div>{players[2]}</div>
      <div />
      <div>{players[3]}</div>
      <div />
    </div>
  )
}

/** Component that renders the upcoming matches */
export function UpcomingMatches ({ matches, startMatch, matchTotal, isComingUpLater, isMini }: {
  matches: UpcomingMatchup[]
  /** First match to be displayed, 0-indexed, leave out for 0 */
  startMatch?: number
  /** Total number of matches, leave out for all matches */
  matchTotal?: number
  /** Whether or not to use the "coming up later" title, leave out for false */
  isComingUpLater?: boolean
  /** Whether or not the component should be considered "mini", which will make its width compact */
  isMini?: boolean
}): JSX.Element {
  const matchComponents: JSX.Element[] = []
  let added = 0
  matches.forEach((match, index) => {
    // to start only at the desired index
    if (startMatch !== undefined && index < startMatch) {
      return
    }

    // to stop after all the added ones are done
    if (matchTotal !== undefined && added >= matchTotal) {
      return
    }

    added++
    matchComponents.push((
      <div className='mb-5 black-shadow-2'>
        <h2
          className='emblem-yellow' style={{
            textAlign: 'center'
          }}
        >Match {match.n}
        </h2>
        <div className='is-flex is-justify-content-center'>
          <TournamentMatchElement match={match} />
        </div>
      </div>
    ))
  })

  const title = isComingUpLater === true ? 'Coming Up Later' : 'Upcoming Matches'
  const width = isMini === true ? undefined : '50%'

  let bgClass

  switch (getWebsiteTheme()) {
    case WebsiteThemes.Fire:
      bgClass = 'emblem-pink-bg'
      break
    case WebsiteThemes.Normal:
      bgClass = 'hideout-gray-bg-alpha'
      break
    default:
      throw new Error('Not implemented')
  }

  return (
    <div
      className={`${bgClass} p-4`} style={{
        borderRadius: '10px',
        width
      }}
    >
      <h1
        className='mb-6 black-shadow' style={{
          fontSize: '32px',
          textAlign: 'center'
        }}
      >{title}
      </h1>
      <div>
        {matchComponents}
      </div>
    </div>
  )
}

/** Component that renders the fire tournament's page */
function FireTournamentPage (): JSX.Element {
  const { isFirstPhase, ranking } = useContext(FireTournamentContext)
  const { upcoming } = useContext(TournamentContext)
  const rankingElement = isFirstPhase ? <FirstPhaseRankings ranking={ranking} /> : <FinalPhaseRankings ranking={ranking} />

  return (
    <div>
      <div className='is-flex is-justify-content-center mt-6'>
        {rankingElement}
      </div>
      <div className='is-flex is-justify-content-center mt-6 mb-5'>
        <UpcomingMatches matches={upcoming} />
      </div>
    </div>
  )
}

/** Round in a normal card-jitsu tournament */
type Round = NormalTournamentMatch[]
/** A bracket in the normal card-jitsu tournament, either the losers or winners */
type Bracket = Round[]

/** Component that renders a player in a match and performance */
function PlayerInMatch ({ player, score, isBottom, lineHeight, height, borderRadius }: {
  /** Player ID, if a player is here, `undefined` if it's a BYE or a string description of how to get here. */
  player: number | undefined | string
  /** Score of this player or nothing if no score */
  score?: number
  /** Whether this is the bottom (right) player */
  isBottom?: true
  /** Constant indicates the height of the line that separates players */
  lineHeight: number
  /** Constant indicates the height of this component */
  height: number
  /** String with the border radius used by the player box as a whole */
  borderRadius: string
}): JSX.Element {
  const playerInfo = useContext(PlayerInfoContext)

  /** Helper component that displayer the name in a match */
  function Name ({ player }: { player: number | undefined | string }): JSX.Element {
    if (typeof player === 'number') {
      return <span>{playerInfo[player]}</span>
    } else if (player === undefined) {
      return <span>BYE</span>
    } else {
      return <span style={{ color: 'gray' }}><i>{player}</i></span>
    }
  }

  const scoreStyle: React.CSSProperties = {
    backgroundColor: 'red',
    position: 'absolute',
    right: '0',
    width: '20px',
    height: '100%',
    textAlign: 'center'
  }
  let topPosition
  if (isBottom === true) {
    scoreStyle.borderBottomRightRadius = borderRadius
    topPosition = lineHeight
  } else {
    scoreStyle.borderTopRightRadius = borderRadius
    topPosition = 0
  }
  const scoreDisplay = score === undefined
    ? (
      <div />
      )
    : (
      <div style={scoreStyle}>
        {score}
      </div>
      )

  return (
    <div
      className='is-flex pl-3' style={{
        position: 'relative',
        height: `${height}px`,
        top: `${topPosition}px`
      }}
    >
      <div style={{
        width: '200px'
      }}
      >
        <Name player={player} />
      </div>
      {scoreDisplay}
    </div>
  )
}

/**
 * Get what this round is named
 * @param round Round number, starts at 1
 * @param size Size of the tournament
 * @param isLoser Whether or not it is in the loser bracket
 * @param emptyRounds Number of empty rounds in the loser bracket (rounds where only "BYE"s played)
 * @returns
 */
function getRoundName (round: number, size: number, isLoser: boolean, emptyRounds: number): string {
  // effective round is used to convey to the viewer the true time passed, but round is used internally for the distance
  const effectiveRound = round - emptyRounds
  if (isLoser) {
    const loserDistance = (size - 1) * 2 - round
    if (loserDistance === 0) {
      return 'Losers Final'
    }
    if (loserDistance === 1) {
      return 'Losers Semi-Final'
    }
    return `Losers Round ${effectiveRound}`
  } else {
    const distance = size - round
    if (effectiveRound === 1) {
      return 'Start Round'
    }
    if (distance === -2) {
      return 'Grand Finals (rematch)'
    }
    if (distance === -1) {
      return 'Grand Finals'
    }
    if (distance === 0) {
      return 'Winners Final'
    }
    if (distance === 1) {
      return 'Winners Semi-Finals'
    }
    if (distance === 2) {
      return 'Winners Quarter-Finals'
    }
    if (distance === 3) {
      return 'Winners Eight-Finals'
    }
    return `Winners Round ${effectiveRound}`
  }
}

/** Component that renders a bracket in double elimination tournaments */
function BracketView ({ bracket, size, isLoser }: {
  /** All rounds in the tournament */
  bracket: Bracket
  /** Size of the tournament */
  size: number
  /** Whether or not this is the losers bracket */
  isLoser: boolean }): JSX.Element {
  let emptyRounds = 0
  const rounds = bracket.map((r, i) => {
    // match < 0 is marked as not an actual match
    const isEmpty = r.every((m) => m.n < 0)
    if (isEmpty) {
      emptyRounds++
      return undefined
    }

    const splitLineHeight = 2 // pixels
    const totalHeight = 50
    const playerHeight = (50 - 2) / 2
    const borderRadius = '3px'
    const roundNameHeight = '32px'
    return (
      <div key={i}>
        <div
          className='my-1 is-flex' style={{
            backgroundColor: 'gray',
            color: 'white',
            width: '100%',
            textAlign: 'center',
            height: roundNameHeight,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {getRoundName(i + 1, size, isLoser, emptyRounds)}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateRows: `repeat(${r.length}, 1fr)`,
          rowGap: '10px',
          flex: 'grow',
          height: `calc(100% - ${roundNameHeight})`
        }}
        >
          {r.map((m, i) => {
            // hiding from view if it's not an actual match
            const isVisible = m.n > 0
            return (
              <div
                key={i} style={{
                  fontSize: '16px',
                  height: '100%',
                  justifyContent: 'center',
                  alignItems: 'center',
                  display: isVisible ? 'flex' : 'none'
                }}
              >
                <div
                  className='mr-1 black-shadow-1' style={{
                    color: 'white',
                    width: '20px'
                  }}
                >
                  {m.n}
                </div>
                <div style={{
                  backgroundColor: 'black',
                  borderRadius,
                  height: `${totalHeight}px`,
                  position: 'relative'
                }}
                >
                  {/* this is the player split line */}
                  <div style={{
                    position: 'absolute',
                    top: `${playerHeight}px`,
                    height: `${splitLineHeight}px`,
                    width: '100%',
                    backgroundColor: 'gray'
                  }}
                  />
                  <PlayerInMatch player={m.player1} score={m.results?.scores[0]} lineHeight={splitLineHeight} height={playerHeight} borderRadius={borderRadius} />
                  <PlayerInMatch player={m.player2} score={m.results?.scores[1]} isBottom lineHeight={splitLineHeight} height={playerHeight} borderRadius={borderRadius} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  })

  return (
    <div
      className='is-flex mb-6' style={{
        columnGap: '20px'
      }}
    >
      {rounds}
    </div>
  )
}

/** Component that renders the full view of elimination bracket for a regulard card-jitsu tournament */
function EliminationBracket (): JSX.Element {
  const { tournament } = useContext(NormalTournamentContext)
  const playerInfo = useContext(PlayerInfoContext)
  const [size, setSize] = useState<number>(0)

  // reference to bracket DIV element used for scrolling
  const bracketDiv = useRef<HTMLDivElement>(null)
  // if scrolling bracket by grabbing
  const isScrolling = useRef<boolean>(false)
  // X position of the mouse before each scrolling cycle
  const startX = useRef<number>(0)

  /** Starts scrolling the bracket */
  function startScrolling (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
    startX.current = e.clientX
    isScrolling.current = true
  }

  /** Stops scrolling the bracket */
  function stopScrolling (): void {
    isScrolling.current = false
  }

  /** Handles the mouse move event to update the bracket scrolling */
  function handleMouseMoveScroll (e: React.MouseEvent<HTMLDivElement, MouseEvent>): void {
    if (isScrolling.current && bracketDiv.current !== null) {
      bracketDiv.current.scrollLeft += 2 * (startX.current - e.clientX)
      startX.current = e.clientX
    }
  }

  useEffect(() => {
    document.addEventListener('mouseup', stopScrolling)
  }, [])

  useEffect(() => {
    setSize(Math.ceil(Math.log2(Object.keys(playerInfo).length)))
  }, [playerInfo])

  if (tournament !== undefined) {
    let bracketElement
    if (tournament.type === 'double-elimination') {
      const winnerBracket: Bracket = []
      const loserBracket: Bracket = []
  
      // in this part here we have to order the rounds accordingly
  
      let match = 0
      let round: Round = []
      let end = 0
      let matchNumber = Math.pow(2, size - 1)
      for (let j = 0; j < size; j++) {
        round = []
        end = match + matchNumber
        for (let i = match; i < end; i++) {
          round.push(tournament.matches[i])
          match++
        }
        winnerBracket.push(round)
        // skip for the first round
        if (j !== 0) {
          round = []
          // this one's inverted
          end = match
          for (let i = match + matchNumber - 1; i >= end; i--) {
            round.push(tournament.matches[i])
            match++
          }
          loserBracket.push(round)
        }
        // skip for the last round
        if (j !== size - 1) {
          round = []
          matchNumber /= 2
          end = match + matchNumber
          for (let i = match; i < end; i++) {
            round.push(tournament.matches[i])
            match++
          }
          loserBracket.push(round)
        }
      }
  
      const grandFinals = tournament.matches[match]
      winnerBracket.push([grandFinals])
      // only add rematch if needed
      if (grandFinals.results !== undefined) {
        winnerBracket.push([tournament.matches[match + 1]])
      }

      bracketElement = (
        <div style={{
          display: 'contents'
        }}>
          <BracketView bracket={winnerBracket} size={size} isLoser={false} />
          <BracketView bracket={loserBracket} size={size} isLoser />
        </div>
      )
    } else if (tournament.type === 'single-elimination') {
      const bracket: Bracket = []
      let matchIndex = 0
      let matchNumber = Math.pow(2, size - 1)
      for (let j = 0; j < size; j++) {
        const round: Round = []
        for (let i = 0; i < matchNumber; i++) {
          round.push(tournament.matches[matchIndex])
          matchIndex++
        }
        bracket.push(round)
        matchNumber /= 2
      }

      bracketElement = (
        <BracketView bracket={bracket} size={size} isLoser={false} />
      )
    }

    return (
      <div
        className='bracket pl-1 is-flex is-justify-content-center is-align-items-center' onMouseMove={handleMouseMoveScroll} onMouseDown={startScrolling} ref={bracketDiv} style={{
          width: '80vw',
          overflowX: 'auto',
          userSelect: 'none'
        }}
      >
        {bracketElement}
      </div>
    )
  }

  return (
    <div />
  )
}

/** Component for the tournament page for a regular card-jitsu tournament */
function NormalTournamentPage (): JSX.Element {
  const { upcoming } = useContext(TournamentContext)

  return (
    <div className='is-flex is-justify-content-center is-flex-direction-column is-align-items-center mb-6'>
      <div style={{
        fontSize: '36px'
      }}
      >
        <Haiku first='The tournament view' second='We can see who is winning' third='And those who are not' />
      </div>
      <EliminationBracket />
      <div className='my-5' />
      <UpcomingMatches matches={upcoming} />
    </div>
  )
}

/** Component that handles rendering the page when the tournament is on-going */
function InTournamentPage (): JSX.Element {
  useEffect(() => {
    addTwitchEmbed('twitch-embed')
  }, [])

  let tournamentPage

  switch (getWebsiteTheme()) {
    case WebsiteThemes.Normal:
      tournamentPage = <NormalTournamentPage />
      break
    case WebsiteThemes.Fire:
      tournamentPage = <FireTournamentPage />
      break
    default:
      throw new Error('Not implemented')
  }

  return (
    <div
      className='has-text-primary burbank is-flex is-justify-content-center' style={{
        width: '100%'
      }}
    >
      <div className='is-flex is-flex-direction-column'>
        <div
          style={{
            fontSize: '72px',
            textShadow: '4px 4px 4px #000, -4px 4px 4px #000, -4px -4px 4px #000, 4px -4px 4px #000'
          }}
        >
          THE TOURNAMENT HAS STARTED!
        </div>
        <div className='is-flex is-justify-content-center mb-6' id='twitch-embed' />
        {tournamentPage}
      </div>
    </div>
  )
}

/** Component handles showing the final standings of the tournament */
function TournamentFinalStandings (): JSX.Element {
  const [standings, setStandings] = useState<FinalStandings>([])
  const playerInfo = useContext(PlayerInfoContext)

  // bg is for the background itself
  // cell is the background for the names
  let bgColorClass
  let cellBgClass: string

  switch (getWebsiteTheme()) {
    case WebsiteThemes.Fire:
      bgColorClass = 'emblem-red-bg'
      cellBgClass = 'emblem-pink-bg'
      break
    case WebsiteThemes.Normal:
      bgColorClass = 'shadow-suit-bg'
      cellBgClass = 'hideout-gray-bg'
      break
    default:
      throw new Error('Not implemented')
  }

  useEffect(() => {
    void (async () => {
      setStandings(await getTournamentFinalStandings())
    })()
  }, [])

  const standingsComponents: JSX.Element[] = []
  // callback used to add a component of a player
  const addComponent = (player: number, rank: number): void => {
    const style: React.CSSProperties = {
      borderRadius: '5px'
    }
    if (rank <= 3) {
      style.borderTopStyle = 'solid'
      style.borderTopWidth = '2px'
    }
    // colors meant to reflect the center of the fire, water and snow symbols
    if (rank === 1) {
      style.borderTopColor = '#e7e550'
    } else if (rank === 2) {
      style.borderTopColor = '#5a77ae'
    } else if (rank === 3) {
      style.borderTopColor = '#ebebeb'
    }

    standingsComponents.push(
      <div key={player} className={`is-flex ${cellBgClass} p-4`} style={style}>
        <div
          className='mr-5 black-shadow' style={{
            fontSize: '32px'
          }}
        >
          {getOrdinalNumber(rank)}
        </div>
        <div
          className='black-shadow' style={{
            fontSize: '24px',
            marginTop: 'auto',
            marginBottom: 'auto'
          }}
        >
          {playerInfo[player]}
        </div>
      </div>
    )
  }

  let rank = 1
  for (const element of standings) {
    // save rank at the start so that ties will show the same rank for everyone
    const currentRank = rank
    if (typeof element === 'number') {
      addComponent(element, currentRank)
      rank++
    } else {
      for (const player of element) {
        addComponent(player, currentRank)
        rank++
      }
    }
  }

  return (
    <div
      className={`is-flex is-flex-direction-column ${bgColorClass} p-5 mb-5`} style={{
        width: '60vw',
        rowGap: '20px'
      }}
    >
      {standingsComponents}
    </div>
  )
}

/** Component that renders the page post tournament */
function PostTournamentPage (): JSX.Element {
  return (
    <div className='has-text-primary is-flex is-justify-content-center burbank'>
      <div className='is-flex is-flex-direction-column is-align-items-center'>
        <div
          className='mb-3' style={{
            fontSize: '32px'
          }}
        >
          <Haiku first='The battle ended' second='The elements rest again' third={'But that\'s not for long'} />
        </div>
        <div style={{
          fontSize: '24px'
        }}
        >
          <Haiku first='Battle aftermath:' second='Contains results of the end' third='the elements chose' />
        </div>
        <TournamentFinalStandings />
        <DiscordWidget />
      </div>
    </div>
  )
}

/** Component for the main page */
export default function MainPage (): JSX.Element {
  const [tournamentState, setTournamentState] = useState<TournamentState>(TournamentState.Unknown)
  const [playerInfo, setPlayerInfo] = useState<{ [id: number]: string }>({})
  const [tournamentDate, setTournamentDate] = useState<Date | null | undefined>(undefined)
  const [upcomingMatches, setUpcomingMatches] = useState<UpcomingMatchup[]>([])

  // fire tournament only data
  const [isFirstPhase, setIsFirstPhase] = useState<boolean>(true)
  const [ranking, setRanking] = useState<Ranking>([])

  // normal tournament only data, `undefined` if not received
  const [tournament, setTournament] = useState<NormalTournament | undefined>(undefined)

  // initializing page
  useEffect(() => {
    void updateTournamentState()

    // connecting socket to watch for tournament updates in real time
    const socket = new UcjWS()

    socket.onOpen(() => {
      // this will connect this ID to receive updates
      socket.send('watch-tournament')
    })

    socket.onMessage((data) => {
      // this will be fired when the tournament is updated
      if (data.type === 'update-tournament') {
        if (data.value.updateAll === true) {
          void updateAllTournamentInfo()
        } else {
          if (data.value.updateState === true) {
            void updateTournamentState()
          }
          if (data.value.updateDate === true) {
            void updateTournamentDate()
          }
          if (data.value.scoreUpdate === true) {
            void updateTournamentScoreDependentInfo()
          }
          if (data.value.playerInfo === true) {
            void updatePlayerInfo()
          }
        }
      }
    })
  }, [])

  /** Update all tournament information in the page */
  async function updateAllTournamentInfo (): Promise<void> {
    await updateTournamentState()
    await updateTournamentDate()
    await updateTournamentScoreDependentInfo()
    await updatePlayerInfo()
  }

  /** Update the tournament state */
  async function updateTournamentState (): Promise<void> {
    const isActive = await isTournamentActive()
    if (isActive) {
      const isFinished = await isTournamentFinished()
      setTournamentState(isFinished ? TournamentState.Finished : TournamentState.InProgress)
    } else {
      setTournamentState(TournamentState.NotStarted)
    }
  }

  /** Update the tournament info that depends on scores */
  async function updateTournamentScoreDependentInfo (): Promise<void> {
    setUpcomingMatches(await getUpcomingMatchups())
    switch (getWebsiteTheme()) {
      case WebsiteThemes.Fire: {
        const isFirstPhase = await isCurrentPhaseFirstPhase()
        setIsFirstPhase(isFirstPhase)
        setRanking(await getRankings(isFirstPhase ? TournamentPhase.Start : TournamentPhase.Final))
        break
      }
      case WebsiteThemes.Normal: {
        setTournament(await getNormalTournament())
        break
      }
    }
  }

  /** Update the player info */
  async function updatePlayerInfo (): Promise<void> {
    setPlayerInfo(await getPlayerInfo())
  }

  /** Update the date for the tournament */
  async function updateTournamentDate (): Promise<void> {
    setTournamentDate(await getTournamentDate())
  }

  // updating whenever base information is changed
  // doing at top level because it's where we have setters easily available
  useEffect(() => {
    void (async () => {
      if (tournamentState === TournamentState.NotStarted) {
        await updateTournamentDate()
      } else if (tournamentState === TournamentState.InProgress || tournamentState === TournamentState.Finished) {
        await updateTournamentScoreDependentInfo()
        await updatePlayerInfo()
      }
    })()
  }, [tournamentState])

  let baseElement: JSX.Element

  switch (tournamentState) {
    case TournamentState.NotStarted: {
      baseElement = (
        <PreTournamentPage />
      )
      break
    }
    case TournamentState.WaitingStart: {
      baseElement = (
        <WaitingStartPage />
      )
      break
    }
    case TournamentState.InProgress: {
      baseElement = (
        <InTournamentPage />
      )
      break
    }
    case TournamentState.Finished: {
      baseElement = (
        <PostTournamentPage />
      )
      break
    }
    default: {
      baseElement = <div />
    }
  }

  let contextProvider
  switch (getWebsiteTheme()) {
    case WebsiteThemes.Normal:
      contextProvider = (
        <NormalTournamentContext.Provider value={{
          tournament
        }}
        >
          {baseElement}
        </NormalTournamentContext.Provider>
      )
      break
    case WebsiteThemes.Fire:
      contextProvider = (
        <FireTournamentContext.Provider value={{ ranking, isFirstPhase }}>
          {baseElement}
        </FireTournamentContext.Provider>
      )
      break
    default:
      throw new Error('Not implemented')
  }

  return (
    <PlayerInfoContext.Provider value={playerInfo}>
      <TournamentContext.Provider value={{
        state: tournamentState,
        setState: setTournamentState,
        date: tournamentDate,
        playerInfo,
        upcoming: upcomingMatches
      }}
      >
        {contextProvider}
      </TournamentContext.Provider>
    </PlayerInfoContext.Provider>
  )
}
