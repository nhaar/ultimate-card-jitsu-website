import { useEffect, useState } from 'react'

import { io } from 'socket.io-client'

import config from './config.json'
import { TournamentMatch, getPlayerInfo, getTournamentMatches } from './api'
import { TournamentContext, TournamentState, TournamentUpdate } from './context/TournamentContext'
import { UpcomingMatches } from './MainPage'
import { PlayerInfoContext } from './context/PlayerInfoContext'

/** Component for the page with independent upcoming matches used for streaming as a popout */
export default function UpcomingMatchesPopout (): JSX.Element {
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [playerInfo, setPlayerInfo] = useState<{ [id: number]: string }>({})

  // connect socket to receive updates and init data
  useEffect(() => {
    const socket = io(config.SERVER_URL)

    socket.emit('watchTournament')

    socket.on('updateTournament', (data: TournamentUpdate) => {
      if (data.updateAll === true || data.scoreUpdate === true) {
        void updateMatches()
      }
    })

    void updateMatches()

    void getPlayerInfo().then(setPlayerInfo)
  }, [])

  /** Updates the upcoming matches */
  async function updateMatches (): Promise<void> {
    const matches = await getTournamentMatches()
    setMatches(matches)
  }

  return (
    <div className='has-text-primary burbank is-flex is-justify-content-center'>
      <PlayerInfoContext.Provider value={playerInfo}>
        <TournamentContext.Provider value={{
          playerInfo,
          upcomingMatches: matches,

          // default values, not used
          state: TournamentState.Unknown,
          date: null,
          ranking: [],
          isFirstPhase: true
        }}
        >
          <UpcomingMatches matches={matches} matchTotal={4} isMini={true} />
          <UpcomingMatches matches={matches} startMatch={4} matchTotal={4} isComingUpLater isMini={true} />
        </TournamentContext.Provider>
      </PlayerInfoContext.Provider>
    </div>
  )
}
