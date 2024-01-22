import { Request, Response } from 'express'

export function asyncWrapper (asyncFn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => void {
  return (req: Request, res: Response): void => {
    asyncFn(req, res).catch((err) => {
      console.error(err)
      res.sendStatus(500)
    })
  }
}
