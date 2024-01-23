import { Request, Response } from 'express'

export function asyncWrapper (asyncFn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => void {
  return (req: Request, res: Response): void => {
    asyncFn(req, res).catch((err) => {
      console.error(err)
      res.sendStatus(500)
    })
  }
}

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
