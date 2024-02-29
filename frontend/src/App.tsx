import React from 'react'

import './styles/styles.scss'
import './styles/navbar.css'
import './styles/candombe.css'
import './styles/burbank.css'
import { determineLogo } from './MainPage'
import MainPage from './MainPage'
import PlayerPage from './PlayerPage'
import PlayerWatchPage from './PlayerWatchPage'
import TournamentControlRoom from './TournamentControlRoom'
import TournamentRules from './TournamentRules'
import AccountCreator from './AccountCreator'
import CPImaginedCredentialsHandler from './CPImaginedCredentialsHandler'
import UpcomingMatchesPopout from './UpcomingMatchesPopout'
import Haiku from './Haiku'

/** Component for the website's whole navbar */
function Navbar (): JSX.Element {
  return (
    <nav className='navbar fire-nav' role='navigation' aria-label='main navigation'>
      <div className='navbar-brand'>
        <a className='navbar-item' href='/'>
          <img
            src={determineLogo()} width={855 / 4} height={645 / 4} style={{
              maxHeight: 'none'
            }}
          />
        </a>

        <a role='button' className='navbar-burger' aria-label='menu' aria-expanded='false' data-target='fireNavbar'>
          <span aria-hidden='true' />
          <span aria-hidden='true' />
        </a>
      </div>

      <div id='fireNavbar' className='navbar-menu'>
        <div className='navbar-start'>
          <a className='navbar-item' href='/'>
            Tournament
          </a>

          <a className='navbar-item' href='/player'>
            Player Page
          </a>
          <a className='navbar-item' href='/rules'>
            Rules
          </a>
        </div>
      </div>
    </nav>
  )
}

/** Component for the entire App */
export default function App (): JSX.Element {
  let Page: JSX.Element

  switch (window.location.pathname) {
    case '/': {
      Page = <MainPage />
      break
    }
    case '/player': {
      Page = <PlayerPage />
      break
    }
    case '/admin-watch': {
      Page = <PlayerWatchPage />
      break
    }
    case '/tournament-control': {
      Page = <TournamentControlRoom />
      break
    }
    case '/rules': {
      Page = <TournamentRules />
      break
    }
    case '/account-create': {
      Page = <AccountCreator />
      break
    }
    case '/cpimagined-credentials': {
      Page = <CPImaginedCredentialsHandler />
      break
    }
    case '/upcoming': {
      Page = <UpcomingMatchesPopout />
      break
    }
    default: {
      Page = <Haiku first={'Ninja, you are lost.'} second="This page you have visited," third='is a 404.' />
      break
    }
  }

  return (
    <div>
      <Navbar />
      {Page}
    </div>
  )
}
