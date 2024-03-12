import { useEffect, useState } from 'react'
import { setCookie } from './utils'
import LoginPage from './LoginPage'
import UserPage from './UserPage'
import { UserRole, getMyUserRole } from './api'

/** Prompts the user if they want to logout or not, and does it if agreed */
export function performLogout (): void {
  const confirm = window.confirm('Do you want to log out?')
  if (confirm) {
    setCookie('token', '')
    window.location.reload()
  }
}

/** Component for the player page, which encompasses all possible users of the website (admins, regular players) */
export default function PlayerPage (): JSX.Element {
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined)

  useEffect(() => {
    void (async () => {
      setUserRole(await getMyUserRole())
    })()
  }, [])

  switch (userRole) {
    case undefined: {
      return <div />
    }
    case UserRole.None: {
      return <LoginPage />
    }
    default: {
      return <UserPage role={userRole} />
    }
  }
}
