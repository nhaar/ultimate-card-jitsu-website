import { useEffect } from 'react'

import './styles/styles.scss'
import './styles/navbar.css'
import './styles/candombe.css'
import './styles/burbank.css'
import './styles/main.css'
import FaviconFire from './images/faviconfire.ico'
import FaviconNormal from './images/faviconnormal.ico'
import BackgroundNormal from './images/backgroundnormal.png'
import BackgroundFire from './images/backgroundfire.png'
import BackgroundWater from './images/backgroundwater.png'
import BackgroundSnow from './images/backgroundsnow.png'
import LogoFire from './images/logofire.png'
import LogoNormal from './images/logonormal.png'

import MainPage from './MainPage'
import PlayerPage from './PlayerPage'
import PlayerWatchPage from './PlayerWatchPage'
import TournamentControlRoom from './TournamentControlRoom'
import TournamentRules from './TournamentRules'
import AccountCreator from './AccountCreator'
import CPImaginedCredentialsHandler from './CPImaginedCredentialsHandler'
import UpcomingMatchesPopout from './UpcomingMatchesPopout'
import CPIAdminAssigner from './CPIAdminAssigner'
import Haiku from './Haiku'
import { WebsiteThemes, getWebsiteTheme } from './website-theme'

// dynamically update site theme based on tourney type
function changeFavicon (theme: WebsiteThemes): void {
  const link = document.getElementById('favicon')
  if (link === null) {
    throw new Error('favicon link element not setup in index.html')
  }
  if (!(link instanceof HTMLLinkElement)) {
    throw new Error('invalid link element')
  }

  switch (theme) {
    case WebsiteThemes.Normal: {
      link.href = FaviconNormal
      break
    }
    case WebsiteThemes.Fire: {
      link.href = FaviconFire
      break
    }
    default: {
      throw new Error('not implemented')
    }
  }
}

function changeBackground (theme: WebsiteThemes): void {
  let image: string
  switch (theme) {
    case WebsiteThemes.Normal: {
      image = BackgroundNormal
      break
    }
    case WebsiteThemes.Fire: {
      image = BackgroundFire
      break
    }
    case WebsiteThemes.Water: {
      image = BackgroundWater
      break
    }
    case WebsiteThemes.Snow: {
      image = BackgroundSnow
      break
    }
    default: {
      throw new Error('not implemented')
    }
  }
  document.body.style.backgroundImage = `url(${image})`
}

export function determineLogo (theme: WebsiteThemes): string {
  switch (theme) {
    case WebsiteThemes.Normal: {
      return LogoNormal
    }
    case WebsiteThemes.Fire: {
      return LogoFire
    }
    default: {
      throw new Error('not implemented')
    }
  }
}

function changeTitle (theme: WebsiteThemes): void {
  let title
  switch (theme) {
    case WebsiteThemes.Normal: {
      title = 'The Ultimate Card-Jitsu Tournament'
      break
    }
    case WebsiteThemes.Fire: {
      title = 'The SPICIEST Card-Jitsu Fire Tournament'
      break
    }
    default: {
      throw new Error('not implemented')
    }
  }
  document.title = title
}

/** Component for the website's whole navbar */
function Navbar (): JSX.Element {
  return (
    <nav className='navbar fire-nav' role='navigation' aria-label='main navigation'>
      <div className='navbar-brand'>
        <a className='navbar-item' href='/'>
          <img
            src={determineLogo(getWebsiteTheme())} width={855 / 4} height={645 / 4} style={{
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

  useEffect(() => {
    const theme = getWebsiteTheme()
    changeFavicon(theme)
    changeBackground(theme)
    changeTitle(theme)
  }, [])

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
    case '/cpiadmin-assign': {
      Page = <CPIAdminAssigner />
      break
    }
    default: {
      Page = <Haiku first='Ninja, you are lost.' second='This page you have visited,' third='is a 404.' />
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
