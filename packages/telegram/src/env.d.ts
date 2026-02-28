declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TELEGRAM_BOT_TOKEN?: string
      GLOBAL_AGENT_HTTP_PROXY?: string
      GLOBAL_AGENT_HTTPS_PROXY?: string
    }
  }
}

export {}
