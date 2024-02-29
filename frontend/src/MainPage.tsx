import { useContext, useEffect, useState } from 'react'
import config from './config.json'
import { Ranking, TournamentMatch, TournamentPhase, getPlayerInfo, getRankings, getTournamentDate, getTournamentMatches, isCurrentPhaseFirstPhase, isTournamentActive, isTournamentFinished } from './api'
import Haiku from './Haiku'
import { TournamentContext, TournamentState, TournamentUpdate } from './context/TournamentContext'
import { io } from 'socket.io-client'
import CountdownTimer from './CountdownTimer';

var titleList: any = {
  "normal": "The Ultimate Card-Jitsu Tournament",
  "fire": "The SPICIEST Card-Jitsu Tournament"
}

// dynamically update site theme based on tourney type
function changeFavicon(src: string) {
  var link = document.createElement('link'),
    oldLink = document.getElementById('dynamic-favicon');
  link.id = 'dynamic-favicon';
  link.rel = 'shortcut icon';
  link.href = src;
  if (oldLink) {
    document.head.removeChild(oldLink);
  }
  document.head.appendChild(link);
}

function changeBackground(image: string) {
  document.body.style.backgroundImage = "url('" + image + "')";
}

export function determineLogo() {
  return ("./images/logo" + config.TOURNAMENT_TYPE + ".png")
}

function changeTitle(title: string) {
  document.title = title
}

if (config.TOURNAMENT_TYPE !== null) {
  // set favicon
  var favicon = "./images/favicon" + config.TOURNAMENT_TYPE + ".ico"
  changeFavicon(favicon)
  // set background
  var background = "./images/background" + config.TOURNAMENT_TYPE + ".png"
  changeBackground(background)
  // set title
  var title = titleList[config.TOURNAMENT_TYPE]
  changeTitle(title)
}

/**
 * Adds a twitch embed with an element that has the given HTML id
 */
function addTwitchEmbed(elementId: string): void {
  if (config.STREAM_CHANNEL !== null) {
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
function DiscordWidget(): JSX.Element {
  if (config.DISCORD_WIDGET !== null) {
    return (
      <iframe src={`https://discord.com/widget?id=${config.DISCORD_WIDGET}&theme=dark`} width='80%' height='500' sandbox='allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts' />
    )
  } else {
    return (<div></div>)
  }
}

/** Component for the page before the tournament starts */
function PreTournamentPage(): JSX.Element {
  const tournamentDate = useContext(TournamentContext).date
  var now = new Date()
  let dateAnnouncement: JSX.Element
  const firstHaikuLine = 'The elements sleep...'
  if (tournamentDate === undefined) {
    dateAnnouncement = <Haiku first={firstHaikuLine} second='And asking for the server...' third='No results are found!' />
  } else if (tournamentDate === null) {
    dateAnnouncement = <Haiku first={firstHaikuLine} second='The future is foggy now,' third='Unknown is the date.' />
  } else if (tournamentDate.getTime() >= now.getTime()) {
    dateAnnouncement = <Haiku first={firstHaikuLine} second="But now they're awakening," third='Soon it will begin...' />
  } else {
    dateAnnouncement = <Haiku first={'The elements wake...'} second="The tournament has begun!" third='Ninjas, it is time...' />
  }

  const dateValueElement = tournamentDate === null
    ? <div />
    : (
      <div>
        <div
          className='mt-3' style={{
            textAlign: 'center',
            color: '#c35617',
            fontSize: '72px'
          }}
        >{tournamentDate?.toLocaleString()}
        </div>
        <CountdownTimer targetDate={tournamentDate} />
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
function PhaseRankings({ ranking, third, title, subtitle }: {
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
      <div style={{
        textAlign: 'center',
        fontSize: '32px',
        textShadow: '3px 3px 3px #000, -3px 3px 3px #000, -3px -3px 3px #000, 3px -3px 3px #000'
      }}
      >
        {title}
      </div>
      <div
        className='mb-1' style={{
          textAlign: 'center',
          fontSize: '18px',
          textShadow: '3px 3px 3px #000, -3px 3px 3px #000, -3px -3px 3px #000, 3px -3px 3px #000'
        }}
      >
        {subtitle}
      </div>
      <TournamentRanking ranking={ranking} />
    </div>
  )
}

/** Component for the rankings in the first phase */
function FirstPhaseRankings({ ranking }: { ranking: Ranking }): JSX.Element {
  return <PhaseRankings ranking={ranking} third='But now it begins.' title='Start Phase' subtitle='This is the first phase. The top 4 ninjas will proceed to the finals.' />
}

/** Component for the rankings in the second phase */
function FinalPhaseRankings({ ranking }: { ranking: Ranking }): JSX.Element {
  return <PhaseRankings ranking={ranking} third='And now is the end.' title='Finals' subtitle='In the finals, only the number one ranked ninja will be victorious.' />
}

/** Component that renders a match's players */
function TournamentMatchElement ({ match }: { match: TournamentMatch }): JSX.Element {
  const { playerInfo } = useContext(TournamentContext)
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
      width: '80%',
      textAlign: 'center',
      textShadow: '2px 2px 2px #000, -2px 2px 2px #000, -2px -2px 2px #000, 2px -2px 2px #000'
    }}
    >
      <div />
      <div>{players[0]}</div>
      <div />
      <div>{players[1]}</div>
      <div className='candombe emblem-yellow' style={{ textShadow: '1px 1px 1px #000, -1px 1px 1px #000, -1px -1px 1px #000, 1px -1px 1px #000' }}>VS</div>
      <div>{players[2]}</div>
      <div />
      <div>{players[3]}</div>
      <div />
    </div>
  )
}

/** Component that renders the upcoming matches */
export function UpcomingMatches ({ matches, startMatch, matchTotal, isComingUpLater }: {
  matches: TournamentMatch[]
  /** First match to be displayed, 0-indexed, leave out for 0 */
  startMatch?: number
  /** Total number of matches, leave out for all matches */
  matchTotal?: number
  /** Whether or not to use the "coming up later" title, leave out for false */
  isComingUpLater?: boolean
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

    // only include matches that haven't been played (i.e. have no standings)
    if (match.standings.length === 0) {
      added++
      matchComponents.push((
        <div className='mb-5'>
          <h2
            className='emblem-yellow' style={{
              textAlign: 'center',
              textShadow: '2px 2px 2px #000, -2px 2px 2px #000, -2px -2px 2px #000, 2px -2px 2px #000'
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

  const title = isComingUpLater === true ? 'Coming Up Later' : 'Upcoming Matches'

  return (
    <div
      className='emblem-pink-bg p-4' style={{
        borderRadius: '10px',
        width: '50%'
      }}
    >
      <h1
        className='mb-6' style={{
          fontSize: '32px',
          textShadow: '3px 3px 3px #000, -3px 3px 3px #000, -3px -3px 3px #000, 3px -3px 3px #000',
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

/** Component that handles rendering the page when the tournament is on-going */
function InTournamentPage (): JSX.Element {
  const { isFirstPhase, ranking, upcomingMatches } = useContext(TournamentContext)

  useEffect(() => {
    addTwitchEmbed('twitch-embed')
  }, [])

  const rankingElement = isFirstPhase ? <FirstPhaseRankings ranking={ranking} /> : <FinalPhaseRankings ranking={ranking} />

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
        <div className='is-flex is-justify-content-center' id='twitch-embed' />
        <div className='is-flex is-justify-content-center mt-6'>
          {rankingElement}
        </div>
        <div className='is-flex is-justify-content-center mt-6 mb-5'>
          <UpcomingMatches matches={upcomingMatches} />
        </div>
      </div>
    </div>
  )
}

/** Component that renders the page post tournament */
function PostTournamentPage (): JSX.Element {
  const { ranking } = useContext(TournamentContext)

  return (
    <div className='has-text-primary is-flex is-justify-content-center burbank mb-6'>
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
          <Haiku first='Battle aftermath:' second='Contains results of the end,' third='Points of the final' />
        </div>
        <TournamentRanking ranking={ranking} />
        <DiscordWidget />
      </div>
    </div>
  )
}

/** Component for the main page */
export default function MainPage(): JSX.Element {
  const [tournamentState, setTournamentState] = useState<TournamentState>(TournamentState.Unknown)
  const [isFirstPhase, setIsFirstPhase] = useState<boolean>(true)
  const [upcomingMatches, setUpcomingMatches] = useState<TournamentMatch[]>([])
  const [ranking, setRanking] = useState<Ranking>([])
  const [playerInfo, setPlayerInfo] = useState<{ [id: number]: string }>({})
  const [tournamentDate, setTournamentDate] = useState<Date | null | undefined>(undefined)

  // initializing page
  useEffect(() => {
    void updateTournamentState()

    // connecting socket to watch for tournament updates in real time
    const socket = io(config.SERVER_URL)

    // this will connect this ID to receive updates
    socket.emit('watchTournament')

    // this will be fired when the tournament is updated
    socket.on('updateTournament', (data: TournamentUpdate) => {
      if (data.updateAll === true) {
        void updateAllTournamentInfo()
      } else {
        if (data.updateState === true) {
          void updateTournamentState()
        }
        if (data.updateDate === true) {
          void updateTournamentDate()
        }
        if (data.scoreUpdate === true) {
          void updateTournamentScoreDependentInfo()
        }
        if (data.playerInfo === true) {
          void updatePlayerInfo()
        }
      }
    })
  }, [])

  /** Update all tournament information in the page */
  async function updateAllTournamentInfo(): Promise<void> {
    await updateTournamentState()
    await updateTournamentDate()
    await updateTournamentScoreDependentInfo()
    await updatePlayerInfo()
  }

  /** Update the tournament state */
  async function updateTournamentState(): Promise<void> {
    const isActive = await isTournamentActive()
    if (isActive) {
      const isFinished = await isTournamentFinished()
      setTournamentState(isFinished ? TournamentState.Finished : TournamentState.InProgress)
    } else {
      setTournamentState(TournamentState.NotStarted)
    }
  }

  /** Update the tournament info that depends on scores */
  async function updateTournamentScoreDependentInfo(): Promise<void> {
    const isFirstPhase = await isCurrentPhaseFirstPhase()
    setIsFirstPhase(isFirstPhase)
    setUpcomingMatches(await getTournamentMatches())
    setRanking(await getRankings(isFirstPhase ? TournamentPhase.Start : TournamentPhase.Final))
  }

  /** Update the player info */
  async function updatePlayerInfo(): Promise<void> {
    setPlayerInfo(await getPlayerInfo())
  }

  /** Update the date for the tournament */
  async function updateTournamentDate(): Promise<void> {
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

  return (
    <TournamentContext.Provider value={{
      state: tournamentState,
      date: tournamentDate,
      ranking,
      playerInfo,
      isFirstPhase,
      upcomingMatches
    }}
    >
      {baseElement}
    </TournamentContext.Provider>
  )
}
