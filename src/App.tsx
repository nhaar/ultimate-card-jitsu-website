import React from 'react'

import './styles/styles.scss'
import './styles/navbar.css'
import './styles/candombe.css'
import Logo from './images/logo.png'
import MaingePage from './MainPage'

function Navbar (): JSX.Element {
  return (
    <nav className='navbar fire-nav' role='navigation' aria-label='main navigation'>
      <div className='navbar-brand'>
        <a className='navbar-item' href='/'>
          <img
            src={Logo} width={855 / 4} height={645 / 4} style={{
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
            Bracket
          </a>

          <a className='navbar-item'>
            Player Page
          </a>
        </div>
      </div>
    </nav>
  )
}

export default function App (): JSX.Element {
  let Page: JSX.Element

  switch (window.location.pathname) {
    case '/': {
      Page = <MaingePage />
      break
    }
    default: {
      Page = <div>404</div>
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
