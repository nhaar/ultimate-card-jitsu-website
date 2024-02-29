# Ultimate Card-Jitsu Tournament Website
The UCJ Tournament website, a TypeScript server with a React.js frontend.

## Set up

1. Install dependencies
Run `npm install` in both the `frontend` and `backend` directories.

2. Set server and website configurations

    For the frontend:
    1. Copy `config-template.json` in `/frontend/src` and rename it to `config.json`
    2. Set your `SERVER_URL` (where your backend is listening)
    3. Set your `DISCORD_WIDGET` (your widget id for your Discord server)
    4. Set your `STREAM_CHANNEL`, (Twitch username for embed on the front page)
    5. Set your `TOURNAMENT_TYPE` (normal, fire, water, or snow for respective theming)

    For the backend:
    1. Copy `config-template.ts` in `/backend/src` and rename it to `config.ts`
    2. Generally the `PG_PORT` will always be `5432` unless you have configured it differently, so you're fine to leave that as-is
    3. Set your postgres username and password in `PG_USER` and `PG_PASSWORD` respectively
    4. Set the database name in `PG_DATABASE`
    **Note: the database structure will automatically generate, however you must create the database manually**
    5. Set your salt value for password encryption in `SALT` (Recommended 10)
    6. Set your admin account name and password in `ADMIN_NAME` and `ADMIN_PASSWORD` respectively

3. Run the server

    For the frontend:
    * Run `npm react-scripts build` to build the site for production, or for local testing, use `npm react-scripts start`
    **Note: nodemon is recommended for local development however is not required**

    For the backend:
    * Run `npm run start` for production, or `npm run dev` for local testing
    **Note: you CANNOT use `nodemon run dev/start`, nodemon will start automatically**

4. You're done!