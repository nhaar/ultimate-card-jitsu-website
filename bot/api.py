import requests

from config import SERVER_URL, BOT_SECRET

def bot_get(route: str) -> requests.Response:
  '''Base function that will correctly make a GET request as the BOT'''
  r = requests.get(SERVER_URL + '/' + route, json={
    'secret': BOT_SECRET
  })
  return r

def get_matchups() -> list[list[int]]:
  '''Fetch matchups'''
  r = bot_get('api/tournament/decided-matchups')
  matchups = r.json()
  return matchups

def get_discords() -> dict:
  '''Fetch discord names of the users'''
  r = bot_get('api/user/discord-names')
  names = r.json()
  return names

def get_player_info() -> dict:
  '''Fetch website names of the users'''
  r = bot_get('api/tournament/players-info')
  info = r.json()
  return info

def ping() -> bool:
  '''Checks whether bot is authenticated'''
  r = bot_get('api/tournament/bot-ping')
  return r.status_code == 200