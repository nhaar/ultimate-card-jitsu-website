import React from 'react'

import { origin } from './origin'
import './styles/styles.scss'
import './styles/navbar.css'
import './styles/candombe.css'
import Logo from './images/logo.png'

export default function App (): JSX.Element {
  return (
    <div>
      <nav className='navbar fire-nav' role='navigation' aria-label='main navigation'>
        <div className='navbar-brand'>
          <a className='navbar-item' href={origin}>
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
            <a className='navbar-item' href={origin}>
              Bracket
            </a>

            <a className='navbar-item'>
              Player Page
            </a>
          </div>
        </div>
      </nav>
      Hello Penguin World
    </div>
  )
}
