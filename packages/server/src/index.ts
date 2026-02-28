import { loadEnvFile } from 'node:process'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { registerAllController } from './controllers'

loadEnvFile('.env')

const app = new Hono()
registerAllController(app)

const server = serve(app)

// Graceful shutdown
process.on('SIGINT', () => {
  server.close()
  process.exit(0)
})

process.on('SIGTERM', () => {
  server.close((err) => {
    if (err) {
      console.error(err)
      process.exit(1)
    }
    process.exit(0)
  })
})
