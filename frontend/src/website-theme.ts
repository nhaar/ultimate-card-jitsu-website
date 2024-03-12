import config from './config.json'

export function getWebsiteTheme (): WebsiteThemes {
  switch (config.TOURNAMENT_TYPE) {
    case 'normal': return WebsiteThemes.Normal
    case 'fire': return WebsiteThemes.Fire
    case 'water': return WebsiteThemes.Water
    case 'snow': return WebsiteThemes.Snow
    default: throw new Error('invalid website theme supplied in JSON')
  }
}

export enum WebsiteThemes {
  Normal,
  Fire,
  Water,
  Snow
}
