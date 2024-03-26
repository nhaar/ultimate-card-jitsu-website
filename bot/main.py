from discord.ext import commands, tasks
import discord

from player_tracker import PlayerTracker
from api import get_matchups, get_discords, get_player_info
from config import BOT_TOKEN, CHANNEL_ID, GUILD_ID

tracker = PlayerTracker()
bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())

@bot.event
async def on_ready():
  print('Sensei is ready')
  
  check_matchups.start()

@tasks.loop(seconds=5)
async def check_matchups():
  '''Task that will repeteadly check if the matchups have changed, and if they have, ping all players as needed'''
  global tracker
  new_tracker = PlayerTracker.from_matchups(get_matchups())
  if new_tracker != tracker:
    tracker = new_tracker
    discords = get_discords()
    player_info = get_player_info()
    await ping_players(tracker.current_players, player_info, discords, 'Up next are: ', '\nGET READY! Start the match when I type in CPImagined to begin.')
    await ping_players(tracker.next_players, player_info, discords, 'After this match are: ', '\nMake sure you get ready for the match and start screensharing. Will ping again when it\'s time for the battle.')

async def ping_players(ids: list[int], player_info: dict, discords: dict, premessage: str, postmessage: str):
  '''
  Helper function that will ping the players with a message
  Args:
    ids: List of all website player IDs that will be alerted
    player_info: Dictionary with player info
    discords: Dictionary with the discord usernames
    premessage: To place before the usernames
    postmessage: To place after the usernames
  '''
  global bot
  guild = bot.get_guild(GUILD_ID)
  channel = bot.get_channel(CHANNEL_ID)
  ids_to_ping = []
  names_to_mention = []
  for id in ids:
    if str(id) in discords:
      user = discord.utils.get(guild.members, name=discords[str(id)])
      if (user == None):
        names_to_mention.append(player_info[str(id)])
      else:
        ids_to_ping.append(user.id)
    else:
      names_to_mention.append(player_info[str(id)])
  
  vs_sep = ' vs '
  vs_substrings = []
  if (len(ids_to_ping) > 0):
    vs_substrings.append(vs_sep.join([f'<@{x}>' for x in ids_to_ping]))
  if (len(names_to_mention) > 0):
    vs_substrings.append(vs_sep.join(names_to_mention))
  vs_string = vs_sep.join(vs_substrings)
  final_message = premessage + vs_string + postmessage
  await channel.send(final_message)
  
bot.run(BOT_TOKEN)
