import { createContext } from "react";

/** To store the player info fetched from the backend */
export const PlayerInfoContext = createContext<{ [id:number]: string }>({})