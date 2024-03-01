import { performLogout } from './PlayerPage'

export default function AdminPage (): JSX.Element {
  return (
    <div
      className='burbank black-shadow' style={{
        textAlign: 'center',
        fontSize: '24pt',
        color: '#FFF'
      }}
    >
      <a href='admin-watch'>PLAYER WATCH</a><br />
      <a href='tournament-control'>TOURNAMENT CONTROL</a><br />
      <a href='account-create'>CREATE ACCOUNTS</a><br />
      <a href='cpimagined-credentials'>CREDENTIALS HANDLER</a><br />
      <button className='button' onClick={performLogout}>Logout</button>
    </div>
  )
}
