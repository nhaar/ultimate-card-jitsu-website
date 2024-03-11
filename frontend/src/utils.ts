import config from './config.json'

/**
 * Used to send a POST request to the server with a JSON object
 * @param route Server route
 * @param object Body of the request
 * @returns
 */
export async function postJSON (route: string, object: object): Promise<Response> {
  const response = await fetch(config.SERVER_URL + '/' + route, {
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
  const response = await fetch(config.SERVER_URL + '/' + route, {
    method: 'GET',
    headers: {
      cookies: document.cookie
    }
  })

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

/**
 * Get a cookie's value with its name
 * @returns The cookie value or `null` if it doesn't exist
 */
export function getCookie (cookieName: string): string | null {
  const cookies = formatCookies(document.cookie)
  return cookies[cookieName] ?? null
}

/** Set the value of a cookie given its name */
export function setCookie (cookieName: string, value: string): void {
  document.cookie = `${cookieName}=${value}`
}

/** Get ordinal number representation (eg 1st, 2nd) */
export function getOrdinalNumber (x: number): string {
  const lastDigit = x % 10
  if (lastDigit === 1 && x % 100 !== 11) {
    return String(x) + 'st'
  } else if (lastDigit === 2 && x % 100 !== 12) {
    return String(x) + 'nd'
  } else if (lastDigit === 3 && x % 100 !== 13) {
    return String(x) + 'rd'
  } else {
    return String(x) + 'th'
  }
}

/**
 * Convert a base64 string into a blob
 * @param b64 Base 64 string
 * @param type MIME type
 * @returns 
 */
export function convertBase64ToBlob (b64: string, type: string): Blob {
  const b64Indicator = 'base64,'
  const startIndex = b64.indexOf(b64Indicator)
  const byteCharacters = atob(b64.slice(startIndex + b64Indicator.length))
  const byteNumbers = new Array(byteCharacters.length)
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i)
  }
  const byteArray = new Uint8Array(byteNumbers)
  return new Blob([byteArray], { type })
}