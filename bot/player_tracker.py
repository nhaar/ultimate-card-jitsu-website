class PlayerTracker:
  ''' Class keeps track of players being alarted.'''

  # Players that are going to play now
  current_players: list[int]

  # Players that will play after this match
  next_players: list[int]

  def __init__(self, current_players: list[int] = None, next_players: list[int] = None):
    self.current_players = [] if current_players == None else current_players
    self.next_players = [] if next_players == None else next_players
  
  @staticmethod
  def from_matchups(matchups: list[list[int]]):
    '''Initialize from the matchups list, fetched from backend'''
    length = len(matchups)
    current_players = []
    next_players = []
    if (length > 0):
      current_players = matchups[0]
    if (length > 1):
      next_players = matchups[1]
    
    return PlayerTracker(current_players=current_players, next_players=next_players)
  
  def __eq__(self, other) -> bool:
    if (len(self.current_players) != len(other.current_players)):
      return False
    for i in range(len(self.current_players)):
      if self.current_players[i] != other.current_players[i]:
        return False
    if (len(self.next_players) != len(other.next_players)):
      return False
    for i in range(len(self.next_players)):
      if self.next_players[i] != other.next_players[i]:
        return False
    
    return True
  

