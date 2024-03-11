import config from './config.json'

/** Object is how the data should be passed through the websockets */
interface StreamWSData {
  /** Identify what the message is for */
  type: string
  /** Any value being passed */
  value: any
}

/** Class for a client websocket being used for the screensharing system */
export class StreamWS {
  /** Reference to the actual websocket */
  ws: WebSocket

  constructor () {
    this.ws = new WebSocket(config.SERVER_URL.replace('http', 'ws'))
  }

  /** Add a callback for a message */
  onMessage (dataCallback: (data: StreamWSData) => void): void {
    this.ws.addEventListener('message', (e) => {
      const data = JSON.parse(e.data) as StreamWSData
      dataCallback(data)
    })
  }

  /** Add a callback for when the socket opens */
  onOpen (callback: () => void) {
    this.ws.addEventListener('open', callback)
  }

  /** Send data through the websocket, with a type and a value */
  send (type: string, value: any): void {
    this.ws.send(JSON.stringify({
      type,
      value
    }))
  }
}