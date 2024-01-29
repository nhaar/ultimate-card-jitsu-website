import { useState } from 'react'
import VidePlayer from './VideoPlayer'
import Notifications from './Notifications'
import Options from './Options'
import { ContextProvider } from './Context/VideoContext'

/**
 * Handles the page where non admin players can perform actions. Not to be confused with PlayerPage which handles all types of users
 * @returns
 */
export default function UserPage (): JSX.Element {
  return (
    <ContextProvider>
      <div>
        <VidePlayer />
      </div>
    </ContextProvider>
  )
}
