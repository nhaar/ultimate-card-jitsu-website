/** Class that stores the information for the tournament updater websocket system */
export default class TournamentUpdater {
  /** List of socket IDs connected to watching changes. */
  viewers: string[] = []

  /** Socket ID of admin that is updating the tournament, or `undefined` if it hasn't been set */
  adminId: string | undefined

  /** Add a new viewer based on their socket ID. */
  addViewer (id: string): void {
    this.viewers.push(id)
  }

  /** Remove a viewer based on their socket ID. */
  removeViewer (id: string): void {
    this.viewers = this.viewers.filter(viewer => viewer !== id)
  }
}
