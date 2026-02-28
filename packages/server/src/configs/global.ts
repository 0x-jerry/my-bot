import os from "node:os";

export const appGlobalConfig = {
  session: {
    workspaceRoot: os.homedir() as string
  },
}
