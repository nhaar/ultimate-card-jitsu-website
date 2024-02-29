import { performLogout } from './PlayerPage'

export default function AdminPage (): JSX.Element {
  return (
    <div style={{
      textAlign: 'center',
      textShadow: '3px 3px 3px #000, -3px 3px 3px #000, -3px -3px 3px #000, 3px -3px 3px #000',
      fontSize: '24pt',
      color: '#FFF'
    }}
    className = "burbank"
    >
      <a href='admin-watch'>PLAYER WATCH</a><br/>
      <a href='tournament-control'>TOURNAMENT CONTROL</a><br/>
      <a href='account-create'>CREATE ACCOUNTS</a><br/>
      <a href='cpimagined-credentials'>CREDENTIALS HANDLER</a><br/>
      <button className="button" onClick={performLogout}>Logout</button>
    </div>
  )
}
