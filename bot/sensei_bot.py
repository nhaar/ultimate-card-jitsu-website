from discord.ext import commands, tasks
import discord

from player_tracker import PlayerTracker
from api import get_matchups, get_discords, get_player_info
from config import BOT_TOKEN, CHANNEL_ID, GUILD_ID

class SenseiBot:
  '''Class for the discord BOT'''

  # Keeps players to alert
  tracker: PlayerTracker

  # Reference to bot
  bot: commands.Bot

  # Dictionaries represent the JSON fetched from the backend
  player_info: dict
  discords: dict

  # Message ID of the last sent message
  last_ping_message: int | None

  def __init__(self):
    self.tracker = PlayerTracker()
    self.bot = commands.Bot(command_prefix="!", intents=discord.Intents.all())
    self.last_ping_message = None
    @self.bot.event
    async def on_ready():
      print('Sensei is ready')
      self.check_matchups.start()
    

  def run(self):
    '''Start the bot'''
    self.bot.run(BOT_TOKEN)

  @tasks.loop(seconds=5)
  async def check_matchups(self):
    '''Task that will repeteadly check if the matchups have changed, and if they have, ping all players as needed'''
    new_tracker = PlayerTracker.from_matchups(get_matchups())
    if new_tracker != self.tracker:
      self.tracker = new_tracker
      self.discords = get_discords()
      self.player_info = get_player_info()
      ping_message = self.get_ping_message(self.tracker.current_players, 'Up next are: ', '\nGET READY! Start the match when I type in CPImagined to begin.') + '\n\n' + self.get_ping_message(self.tracker.next_players, 'After this match are: ', '\nMake sure you get ready for the match and start screensharing. Will ping again when it\'s time for the battle.')
      await self.ping_players(ping_message)

  async def ping_players(self, message: str) -> None:
    '''Function to send message that should ping players that must play now'''
    channel = self.bot.get_channel(CHANNEL_ID)
    if self.last_ping_message != None:
      previous_message = await channel.fetch_message(self.last_ping_message)
      await previous_message.delete()
    
    sent_message = await channel.send(message)
    self.last_ping_message = sent_message.id

  def get_ping_message(self, ids: list[int], premessage: str, postmessage: str) -> str:
    '''
    Helper function that will get the message to ping players
    
    Args:
      ids: List of all website player IDs that will be alerted
      premessage: To place before the usernames
      postmessage: To place after the usernames
    '''
    guild = self.bot.get_guild(GUILD_ID)
    ids_to_ping = []
    names_to_mention = []
    for id in ids:
      if str(id) in self.discords:
        user = discord.utils.get(guild.members, name=self.discords[str(id)])
        if (user == None):
          names_to_mention.append(self.player_info[str(id)])
        else:
          ids_to_ping.append(user.id)
      else:
        names_to_mention.append(self.player_info[str(id)])
    
    vs_sep = ' vs '
    vs_substrings = []
    if (len(ids_to_ping) > 0):
      vs_substrings.append(vs_sep.join([f'<@{x}>' for x in ids_to_ping]))
    if (len(names_to_mention) > 0):
      vs_substrings.append(vs_sep.join(names_to_mention))
    vs_string = vs_sep.join(vs_substrings)
    return premessage + vs_string + postmessage
