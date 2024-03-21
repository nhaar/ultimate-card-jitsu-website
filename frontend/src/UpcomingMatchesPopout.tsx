import { useEffect, useState } from 'react'

import { TournamentMatch, getPlayerInfo, getTournamentMatches } from './api'
import { FireTournamentContext, TournamentContext, TournamentState } from './context/TournamentContext'
import { UpcomingMatches } from './MainPage'
import { PlayerInfoContext } from './context/PlayerInfoContext'
import { UcjWS } from './ws'

/** Component for the page with independent upcoming matches used for streaming as a popout */
export default function UpcomingMatchesPopout (): JSX.Element {
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [playerInfo, setPlayerInfo] = useState<{ [id: number]: string }>({})

  // connect socket to receive updates and init data
  useEffect(() => {
    const socket = new UcjWS()

    socket.onOpen(() => {
      socket.send('watch-tournament')
    })

    socket.onMessage((data) => {
      if (data.type === 'update-tournament') {
        if (data.value.updateAll === true || data.value.scoreUpdate === true) {
          void updateMatches()
        }
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

  // for reasons beyond me, I have to use this value so that it's exactly halfway through
  const absolutePosition = '49.349vw'

  return (
    <div
      className='has-text-primary burbank' style={{
        // slightly bigger because the popup is that big
        minHeight: '150vh'
      }}
    >
      <PlayerInfoContext.Provider value={playerInfo}>
        <TournamentContext.Provider value={{
          playerInfo,

          // default values, not used
          state: TournamentState.Unknown,
          date: null
        }}
        >
          <FireTournamentContext.Provider value={{
            upcomingMatches: matches,

            // default values, not used
            isFirstPhase: true,
            ranking: []
          }}
          >
            <div style={{
              position: 'absolute',
              right: absolutePosition
            }}
            >
              <UpcomingMatches matches={matches} matchTotal={4} isMini />
            </div>
            <div style={{
              position: 'absolute',
              left: absolutePosition
            }}
            >
              <UpcomingMatches matches={matches} startMatch={4} matchTotal={4} isComingUpLater isMini />
            </div>
          </FireTournamentContext.Provider>
        </TournamentContext.Provider>
      </PlayerInfoContext.Provider>
    </div>
  )
}
