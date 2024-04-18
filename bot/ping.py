from api import ping

print('PING')
if ping():
  print('PONG')
else:
  print('Could not authenticate bot')