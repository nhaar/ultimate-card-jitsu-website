import { useEffect, useState } from 'react'
import { getJSON } from './utils'
import { WIDGET_ID } from './discord-widget'
import { STREAM_CHANNEL } from './stream-channel'

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
      const Twitch = (window as any).Twitch;
      // need to remove it because react adds it twice
      (document.querySelector('#twitch-embed') as HTMLElement).innerHTML = ''

      // can't do anything about this warning since using new is how the Twitch docs tell you to do it
      /* eslint-disable no-new */
      new Twitch.Embed('twitch-embed', {
        width: 854,
        height: 480,
        channel: STREAM_CHANNEL
      })
      /* eslint-disable no-new */
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

/** Component for the main page */
export default function MainPage (): JSX.Element {
  const [tournamentState, setTournamentState] = useState<TournamentState>(TournamentState.Unknown)

  useEffect(() => {
    void (async () => {
      const response = await getJSON('api/tournament/active')
      if (response !== null) {
        const isActive = (response as { active: boolean }).active
        if (isActive) {
          setTournamentState(TournamentState.InProgress)
        } else {
          setTournamentState(TournamentState.NotStarted)
        }
      }
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
  }

  return (
    <div>
      HUh?
    </div>
  )
}
