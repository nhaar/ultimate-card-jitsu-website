import { WebsiteThemes, getWebsiteTheme } from './website-theme'
import config from './config.json'

/** Component that renders the tournament rules page */
export default function TournamentRules (): JSX.Element {
  const theme = getWebsiteTheme()
  let paragraphs: string[] = []
  switch (theme) {
    case WebsiteThemes.Fire: {
      paragraphs = [
        'The tournament will consist of two phases, which are similar to each other. In each phase, a certain number of players will be distributed along 4-player matches. At the end of each match, the players will receive points based on their performance in the match. The winner will be rewarded 4 points, the second place will receive 3 points, the third place will receive 1 points and the fourth place will receive no points. The players will then be ranked based on their points.',
        'In the eventuality of a tie taking place, the players tied will fight each other in a sudden match, and the winners of the tie will have a greater rank than the losers of the tie.',
        'In the first phase, all players that signed up will play, and the top 4 ranking ninjas will advance to the next phase. Each player will play at least 4 times in the first phase.',
        'In the second and final phase, the winners of the first phase will play 3 matches against one another, in a brutal showdown for who will become the champion of the tournament.'
      ]
      break
    }
    case WebsiteThemes.Normal: {
      paragraphs = []
      if (config.NORMAL_TYPE === 'double') {
        paragraphs = [
          'The tournament consists of a double elimination bracket. A double elimination bracket consists of the main bracket,c alled the winners bracket, where people will be matchmaked in the same format you see in cups like the "World Cup". Everyone who loses, is sent to the Losers Bracket where they will have a second chance. The winner of the Winners Bracket is qualified for the Grand Finals.',
          'In the Loser Bracket, people who have lost compete with one another in phases. Anyone who loses in here is eliminated from the tournament. At the end, one person will stand as the winner of the Loser Brackets, and they will be qualified to play in the Grand Finals.',
          'The Grand Finals is the last match that takes place. The winner of this match is the champion, while the loser, the 2nd place. Because the player that won the Winner Bracket has not been defeated yet, while the winner of the Loser Bracket has been defeated once, the Winner Bracket winner has an advantage. If the Loser Bracket winner is to win, there will be a rematch. Otherwise, if the Winner Bracket winner wins right away, there is no such rematch. So, in other words, the Loser Bracket winner has a harder task to overcome in order to become the champion.'
        ]
      } else if (config.NORMAL_TYPE === 'single') {
        paragraphs = [
          'The tournament consists of a single elimination bracket. If you don\'t understand what that means, it is very similar to most tournaments, like the knockout phase of the World Cup, players will begin in a bracket and advance through each match until the final. If you lose once, you will be eliminated! Matches further into the tournament will consist of multiple games, such as best of 3. One and only one ninja will be the champion! There is no match for third place, unlike in some other single elimination bracket tournaments.'
        ]
      }
      break
    }
    default: {
      throw new Error('not implemented')
    }
  }
  return (
    <div
      className='has-text-primary p-6 burbank black-shadow' style={{
        fontSize: '14pt'
      }}
    >
      {paragraphs.map((p, i) => {
        return (
          <p key={i} className='mb-3'>{p}</p>
        )
      })}
    </div>
  )
}
