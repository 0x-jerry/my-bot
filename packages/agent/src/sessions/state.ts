import type { WSContext } from "hono/ws";

export interface SessionState {
  id: string;
  ws?: WSContext;
}

export class SessionStateManager {
  state = new Map<string, SessionState>();

  upsert(state: SessionState) {
    this.state.set(state.id, state);
  }

  get(id: string) {
    return this.state.get(id);
  }

  remove(id: string) {
    this.state.delete(id);
  }
}
