export const config = {
  /** Port postgres is using, default is 5432 */
  PG_PORT: 5432,
  /** Name of the postgres user in charge of the database */
  PG_USER: '',
  /** Name of the database in postgres. It must be created manually */
  PG_DATABASE: '',
  /** Password of the user in charge of the database */
  PG_PASSWORD: '',
  /** Salt value for the password encryption */
  SALT: 0,
  /** Name of the admin user in the website */
  ADMIN_NAME: '',
  /** Password of the admin user in the website */
  ADMIN_PASSWORD: ''
} 