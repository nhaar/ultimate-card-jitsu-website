import { useContext, useEffect, useState } from 'react'
import { getJSON } from './utils'
import { WIDGET_ID } from './discord-widget'
import { STREAM_CHANNEL } from './stream-channel'
import { Ranking, TournamentMatch, TournamentPhase, getPlayerInfo, getRankings, getTournamentMatches, isCurrentPhaseFirstPhase, isTournamentActive } from './api'
import { PlayerInfoContext } from './context/PlayerInfoContext'

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
  const Twitch = (window as any).Twitch
  // can't do anything about this warning since using new is how the Twitch docs tell you to do it
  /* eslint-disable no-new */
  new Twitch.Embed(elementId, {
    width: 854,
    height: 480,
    channel: STREAM_CHANNEL
  })
  /* eslint-disable no-new */
}

/** Component for the page before the tournament starts */
function PreTournamentPage (): JSX.Element {
  const [tournamentDate, setTournamentDate] = useState<Date | null | undefined>(undefined)

  useEffect(() => {
    void (async () => {
      const response = await getJSON('api/tournament/date')
      if (response !== null) {
        const date = (response as { date: Date | null }).date
        setTournamentDate(date)
      }
    })()
  }, [])

  let dateString: string
  if (tournamentDate === undefined) {
    dateString = ''
  } else if (tournamentDate === null) {
    dateString = 'And they will continue sleeping...'
  } else {
    dateString = tournamentDate.toLocaleDateString()
  }

  const isDateDecided = tournamentDate !== undefined && tournamentDate !== null

  useEffect(() => {
    if (tournamentDate !== null && tournamentDate !== undefined) {
      addTwitchEmbed('twitch-embed')
    }
  }, [tournamentDate])

  return (
    <div>
      <div>
        The elements are sleeping...
      </div>
      <div>
        {dateString}
      </div>
      <div>
        <div>
          Connect with the other ninjas.
          And receive updates about the tournament.
          Friendship is a strong element.
        </div>
        <iframe src={`https://discord.com/widget?id=${WIDGET_ID}&theme=dark`} width='350' height='500' allowTransparency sandbox='allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts' />

        <div>
          {isDateDecided && <div>Keep your eyes peeled in case the tournament is starting!</div>}
          <div id='twitch-embed' />
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

/** Component for the rankings in the first phase */
function FirstPhaseRankings ({ ranking }: { ranking: Ranking }): JSX.Element {
  return (
    <div>
      <h1>Tournament is currently in the first phase.</h1>
      <TournamentRanking ranking={ranking} />
    </div>
  )
}

/** Component for the rankings in the second phase */
function FinalPhaseRankings ({ ranking }: { ranking: Ranking }): JSX.Element {
  return (
    <div>
      <h1>Tournament is currently in the final group stage.</h1>
      <TournamentRanking ranking={ranking} />
    </div>
  )
}

/** Component that renders a match's players */
function TournamentMatchElement ({ match }: { match: TournamentMatch }): JSX.Element {
  const playerInfo = useContext(PlayerInfoContext)
  const players = match.runners.map((runner) => playerInfo[runner])


  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      width: '200px',
      textAlign: 'center'
    }}>
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
  return (
    <div>
      <h1>Upcoming Matches</h1>
      <div>
        {matches.map((match, index) => <TournamentMatchElement key={index} match={match} />)}
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
        className='is-flex is-flex-direction-column is-justify-content-center' style={{
          width: '100%'
        }}
      >
        <div>
          <div
            className='p-4 is-flex is-justify-content-center candombe' style={{
              fontSize: '72px'
            }}
          >THE TOURNAMENT HAS STARTED!
          </div>
          <div className='is-flex is-justify-content-center' id='twitch-embed' />
        </div>
        <div>
          {rankingElement}
        </div>
        <UpcomingMatches matches={upcomingMatches} />
      </div>
    </PlayerInfoContext.Provider>
  )
}

/** Component for the main page */
export default function MainPage (): JSX.Element {
  const [tournamentState, setTournamentState] = useState<TournamentState>(TournamentState.Unknown)

  useEffect(() => {
    void (async () => {
      const isActive = await isTournamentActive()
      setTournamentState(isActive ? TournamentState.InProgress : TournamentState.NotStarted)
    })()
  }, [])

  switch (tournamentState) {
    case TournamentState.Unknown: {
      return (
        <div />
      )
    }
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
  }

  return (
    <div>
      HUh?
    </div>
  )
}
