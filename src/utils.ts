import { SERVER_URL } from './urls'

/**
 * Used to send a POST request to the server with a JSON object
 * @param route Server route
 * @param object Body of the request
 * @returns
 */
export async function postJSON (route: string, object: object): Promise<Response> {
  const response = await fetch(SERVER_URL + '/' + route, {
    method: 'POST',
    body: JSON.stringify(object),
    headers: {
      'Content-Type': 'application/json',
      cookies: document.cookie
    }
  })

  return response
}

/**
 * Used to send a POST request to the server with a JSON object and receive a response as a JSON object
 * @param route Server route
 * @param object Body of request
 * @returns Null if the response is not a JSON object, otherwise the JSON object
 */
export async function postAndGetJSON (route: string, object: object): Promise<object | null> {
  const response = await postJSON(route, object)
  let data: object | null = null
  try {
    data = await response.json()
  } catch (error) {
    console.error(error)
  }
  return data
}

/**
 * Sends a GET request to the server and receives a JSON object
 * @param route Server route
 * @returns Null if the response is not a JSON object, otherwise the JSON object
 */
export async function getJSON (route: string): Promise<object | null> {
  const response = await fetch(SERVER_URL + '/' + route)

  let data: object | null = null
  try {
    data = await response.json()
  } catch (error) {
    console.error(error)
  }
  return data
}

/**
 * Formats a string of cookies into an object
 * @param str
 * @returns
 */
export function formatCookies (str: string): { [key: string]: string } {
  const matches = str.match(/\w+=\w+(?=($|;))/g)
  const cookies: { [key: string]: string } = {}
  if (matches != null) {
    matches.forEach(match => {
      const [name, value] = match.match(/\w+/g) as [string, string]
      cookies[name] = value
    })
  }

  return cookies
}
