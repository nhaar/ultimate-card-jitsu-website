# Ultimate Card-Jitsu Tournament Website
The UCJ Tournament website, a TypeScript express server with a React.js frontend.

## Set up

1. Install dependencies
Run `npm install` in both the `frontend` and `backend` directories.

2. Set server and website configurations

    For the frontend:
    1. Copy `config-template.json` in `/frontend/src` and rename it to `config.json`
    2. Set your `SERVER_URL` (where your backend is listening, WITHOUT the ending `\`)
    3. Set your `DISCORD_WIDGET` (widget id for the Discord server on the front page)
    4. Set your `STREAM_CHANNEL`, (Twitch username for embed on the front page)
    5. Set your `TOURNAMENT_TYPE` (`normal`, `fire`, `water`, or `snow` for respective theming)

    For the backend:
    1. Copy `config-template.ts` in `/backend/src` and rename it to `config.ts`
    2. Generally the `PG_PORT` will always be `5432` unless you have configured it differently, so you're fine to leave that as-is
    3. Set your postgres username and password in `PG_USER` and `PG_PASSWORD` respectively
    4. Set the database name in `PG_DATABASE`
    **Note: the database structure will automatically generate, however you must create the database manually**
    5. Set your salt value for password encryption in `SALT` (Recommended at least around 10)
    6. Set your admin account name (for the website itself) and password in `ADMIN_NAME` and `ADMIN_PASSWORD` respectively

3. Run the server

    For development:
    * In the frontend, run `npm start` and it will start the local dev server. In the backend, run `npm run dev` and it will run the webserver with nodemon.

    For production:
    * In the frontend, run `npm run build`, and after that, move the `build` folder to the public folder in the backend: (in the root directory) `mv frontend/build backend/public`. Finally, run in the backend `npm start`.

4. You're done!

## Helper

The helper is a third part of the repository meant for very basic API scraping used to collect data and display in OBS. It is very simple and is not worth touching unless you're the tournament host.

## Discord Bot

The discord bot will keep track of which players are to play and ping them. For it to work, the database must have been correctly updated to contain the correct discord usernames.

Bot setup:

1. First, create the bot in Discord
2. Then, go to `bot/config_template.py`, rename it to `bot/config.py` and write the needed details.
3. Install the libraries in `bot/requirements.txt`
4. Run the bot with `python bot/main.py`