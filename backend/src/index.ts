import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Bindings } from './types'
import resources from './routes/resources'
import admin from './routes/admin'

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'x-admin-token'],
  allowMethods: ['POST', 'GET', 'OPTIONS', 'PUT', 'DELETE'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}))

app.get('/', (c) => {
  return c.text('MOAPYR API is running')
})

app.route('/api/resources', resources)
app.route('/api/admin', admin)

export default app
