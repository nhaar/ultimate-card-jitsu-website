import { useEffect, useState } from 'react'
import { postAndGetJSON } from './utils'
import LoginPage from './LoginPage'
import UserPage from './UserPage'
import AdminPage from './AdminPage'

type UserRole = 'user' | 'admin' | 'none'

/** Component for the player page, which encompasses all possible users of the website (admins, regular players) */
export default function PlayerPage (): JSX.Element {
  const [userRole, setUserRole] = useState<UserRole | undefined>(undefined)

  useEffect(() => {
    void (async () => {
      const response = await postAndGetJSON('api/user/user-role', {})
      if (response !== null) {
        const role = (response as { role: UserRole }).role
        setUserRole(role)
      }
    })()
  }, [])

  switch (userRole) {
    case undefined: {
      return <div>Loading...</div>
    }
    case 'none': {
      return <LoginPage />
    }
    case 'user': {
      return <UserPage />
    }
    case 'admin': {
      return <AdminPage />
    }
  }
}
