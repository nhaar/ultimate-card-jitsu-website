import { useContext, useEffect, useState } from 'react'
import { WIDGET_ID } from './discord-widget'
import { STREAM_CHANNEL } from './stream-channel'
import { Ranking, TournamentMatch, TournamentPhase, getPlayerInfo, getRankings, getTournamentDate, getTournamentMatches, isCurrentPhaseFirstPhase, isTournamentActive, isTournamentFinished } from './api'
import { PlayerInfoContext } from './context/PlayerInfoContext'
import Haiku from './Haiku'

/** Stage of the tournament */
enum TournamentState {
  /** Default */
  Unknown,
  /** Starting soon, not started */
  NotStarted,
  InProgress,
  /** Just finished, wrapping up */
  Finished
}

/**
 * Adds a twitch embed with an element that has the given HTML id
 */
function addTwitchEmbed (elementId: string): void {
  // loaded from script
  const Twitch = (window as any).Twitch;

  // for dev server, need to clear the element first
  (document.getElementById(elementId) as HTMLElement).innerHTML = ''

  // can't do anything about this warning since using new is how the Twitch docs tell you to do it
  /* eslint-disable no-new */
  new Twitch.Embed(elementId, {
    width: 854,
    height: 480,
    channel: STREAM_CHANNEL
  })
  /* eslint-disable no-new */
}

/** Component that creates the widget for the Discord server */
function DiscordWidget (): JSX.Element {
  return (
    <iframe src={`https://discord.com/widget?id=${WIDGET_ID}&theme=dark`} width='350' height='500' allowTransparency sandbox='allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts' />
  )
}

/** Component for the page before the tournament starts */
function PreTournamentPage (): JSX.Element {
  const [tournamentDate, setTournamentDate] = useState<Date | null | undefined>(undefined)

  useEffect(() => {
    void (async () => {
      const date = await getTournamentDate()
      setTournamentDate(date)
    })()
  }, [])

  let dateAnnouncement: JSX.Element
  const firstHaikuLine = 'The elements sleep...'
  if (tournamentDate === undefined) {
    dateAnnouncement = <Haiku first={firstHaikuLine} second='And asking for the server...' third='No results are found!' />
  } else if (tournamentDate === null) {
    dateAnnouncement = <Haiku first={firstHaikuLine} second='The future is foggy now,' third='Unknown is the date.' />
  } else {
    dateAnnouncement = <Haiku first={firstHaikuLine} second='But now awaking they are,' third='Soon it will begin...' />
  }

  const dateValueElement = tournamentDate === null
    ? <div />
    : (
      <div
        className='mt-3' style={{
          textAlign: 'center',
          color: '#c35617',
          fontSize: '72px'
        }}
      >{tournamentDate?.toLocaleString()}
      </div>
      )

  const isDateDecided = tournamentDate !== undefined && tournamentDate !== null

  useEffect(() => {
    if (tournamentDate !== null && tournamentDate !== undefined) {
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
      <div className='is-flex is-justify-content-center my-3 is-flex-direction-column'>
        {dateAnnouncement}
        {dateValueElement}
      </div>
      <div className='is-flex is-justify-content-center is-flex-direction-column mt-6'>
        <Haiku first='Place to go exists,' second='with power ninjas must know:' third='Power of friendship' />
        <div className='is-flex is-justify-content-center mt-3 mb-6'>
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

/** Component that handles rendering a table with rankings from an input ranking object from the backend */
function TournamentRanking ({ ranking }: { ranking: Ranking }): JSX.Element {
  const playerInfo = useContext(PlayerInfoContext)

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
function PhaseRankings ({ ranking, third, title }: {
  /** Ranking object, from the backend */
  ranking: Ranking
  /** The ranking was built to have a haiku with the first two lines set, this defines the third one */
  third: string
  /** Title to display for the phase */
  title: string
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
      <div style={{
        textAlign: 'center',
        fontSize: '32px'
      }}
      >
        {title}
      </div>
      <TournamentRanking ranking={ranking} />
    </div>
  )
}

/** Component for the rankings in the first phase */
function FirstPhaseRankings ({ ranking }: { ranking: Ranking }): JSX.Element {
  return <PhaseRankings ranking={ranking} third='But now it begins.' title='Start Phase' />
}

/** Component for the rankings in the second phase */
function FinalPhaseRankings ({ ranking }: { ranking: Ranking }): JSX.Element {
  return <PhaseRankings ranking={ranking} third='And now is the end.' title='Finals' />
}

/** Component that renders a match's players */
function TournamentMatchElement ({ match }: { match: TournamentMatch }): JSX.Element {
  const playerInfo = useContext(PlayerInfoContext)
  const players = match.runners.map((runner) => {
    if (runner === null) {
      return '??????'
    } else {
      return playerInfo[runner]
    }
  })

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      width: '200px',
      textAlign: 'center'
    }}
    >
      <div />
      <div>{players[0]}</div>
      <div />
      <div>{players[1]}</div>
      <div className='candombe'>VS</div>
      <div>{players[2]}</div>
      <div />
      <div>{players[3]}</div>
      <div />
    </div>
  )
}

/** Component that renders the upcoming matches */
function UpcomingMatches ({ matches }: { matches: TournamentMatch[] }): JSX.Element {
  const matchComponents: JSX.Element[] = []
  matches.forEach((match, index) => {
    // only include matches that haven't been played (i.e. have no standings)
    if (match.standings.length === 0) {
      matchComponents.push((
        <div className='mb-5'>
          <h2
            className='emblem-yellow' style={{
              textAlign: 'center'
            }}
          >Match {index + 1}
          </h2>
          <div className='is-flex is-justify-content-center'>
            <TournamentMatchElement match={match} />
          </div>
        </div>
      ))
    }
  })

  return (
    <div
      className='emblem-pink-bg p-4' style={{
        borderRadius: '10px'
      }}
    >
      <h1
        className='mb-6' style={{
          fontSize: '32px'
        }}
      >Upcoming Matches
      </h1>
      <div>
        {matchComponents}
      </div>
    </div>
  )
}

/** Component that handles rendering the page when the tournament is on-going */
function InTournamentPage (): JSX.Element {
  const [ranking, setRanking] = useState<Ranking>([])
  const [playerInfo, setPlayerInfo] = useState<{ [id: number]: string }>({})
  const [isFirstPhase, setIsFirstPhase] = useState<boolean>(true)
  const [upcomingMatches, setUpcomingMatches] = useState<TournamentMatch[]>([])

  useEffect(() => {
    void (async () => {
      const phase = await isCurrentPhaseFirstPhase()
      setRanking(await getRankings(phase ? TournamentPhase.Start : TournamentPhase.Final))
      setPlayerInfo(await getPlayerInfo())
      setUpcomingMatches(await getTournamentMatches())
      setIsFirstPhase(phase)
    })()
    addTwitchEmbed('twitch-embed')
  }, [])

  const rankingElement = isFirstPhase ? <FirstPhaseRankings ranking={ranking} /> : <FinalPhaseRankings ranking={ranking} />

  return (
    <PlayerInfoContext.Provider value={playerInfo}>
      <div
        className='has-text-primary burbank is-flex is-justify-content-center' style={{
          width: '100%'
        }}
      >
        <div className='is-flex is-flex-direction-column'>
          <div
            style={{
              fontSize: '72px'
            }}
          >
            THE TOURNAMENT HAS STARTED!
          </div>
          <div className='is-flex is-justify-content-center' id='twitch-embed' />
          <div className='is-flex is-justify-content-center mt-6'>
            {rankingElement}
          </div>
          <div className='is-flex is-justify-content-center mt-6 mb-5'>
            <UpcomingMatches matches={upcomingMatches} />
          </div>
        </div>
      </div>
    </PlayerInfoContext.Provider>
  )
}

/** Component that renders the page post tournament */
function PostTournamentPage (): JSX.Element {
  return (
    <div className='has-text-primary is-flex is-justify-content-center burbank mb-6'>
      <div className='is-flex is-flex-direction-column'>
        <div
          className='mb-3' style={{
            fontSize: '32px'
          }}
        >
          <Haiku first='The battle ended' second='The elements rest again' third={'But that\'s not for long'} />
        </div>
        <DiscordWidget />
      </div>
    </div>
  )
}

/** Component for the main page */
export default function MainPage (): JSX.Element {
  const [tournamentState, setTournamentState] = useState<TournamentState>(TournamentState.Unknown)

  useEffect(() => {
    void (async () => {
      const isActive = await isTournamentActive()
      if (isActive) {
        const isFinished = await isTournamentFinished()
        setTournamentState(isFinished ? TournamentState.Finished : TournamentState.InProgress)
      } else {
        setTournamentState(TournamentState.NotStarted)
      }
    })()
  }, [])

  switch (tournamentState) {
    case TournamentState.NotStarted: {
      return (
        <PreTournamentPage />
      )
    }
    case TournamentState.InProgress: {
      return (
        <InTournamentPage />
      )
    }
    case TournamentState.Finished: {
      return (
        <PostTournamentPage />
      )
    }
  }

  return (
    <div />
  )
}
