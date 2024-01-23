import { SERVER_URL } from "./urls"

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