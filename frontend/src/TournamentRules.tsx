import { WebsiteThemes, getWebsiteTheme } from './website-theme'

/** Component that renders the tournament rules page */
export default function TournamentRules (): JSX.Element {
  const theme = getWebsiteTheme()
  switch (theme) {
    case WebsiteThemes.Fire: {
      return (
        <div
          className='has-text-primary p-6 burbank black-shadow' style={{
            fontSize: '14pt'
          }}
        >
          <p className='mb-3'>
            The tournament will consist of two phases, which are similar to each other. In each phase, a certain number of players will be distributed along 4-player matches. At the end of each match, the players will receive points based on their performance in the match. The winner will be rewarded 4 points, the second place will receive 3 points, the third place will receive 1 points and the fourth place will receive no points. The players will then be ranked based on their points.
          </p>
          <p className='mb-3'>
            In the eventuality of a tie taking place, the players tied will fight each other in a sudden match, and the winners of the tie will have a greater rank than the losers of the tie.
          </p>
          <p className='mb-3'>
            In the first phase, all players that signed up will play, and the top 4 ranking ninjas will advance to the next phase. Each player will play at least 4 times in the first phase.
          </p>
          <p className='mb-3'>
            In the second and final phase, the winners of the first phase will play 3 matches against one another, in a brutal showdown for who will become the champion of the tournament.
          </p>
        </div>
      )
    }
    default: {
      throw new Error('not implemented')
    }
  }
}
