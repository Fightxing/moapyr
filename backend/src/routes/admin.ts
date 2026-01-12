import { Hono } from 'hono'
import { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// Middleware for auth
app.use('/*', async (c, next) => {
  const token = c.req.header('x-admin-token')
  if (token !== c.env.AUTH_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

// List Pending Reviews
app.get('/pending', async (c) => {
  const { results } = await c.env.DB.prepare(`SELECT * FROM resources WHERE status = 'pending' ORDER BY created_at ASC`).all()
  return c.json({ results })
})

// Approve
app.post('/approve/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare(`UPDATE resources SET status = 'approved', updated_at = strftime('%s', 'now') WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// Reject (Delete)
app.post('/reject/:id', async (c) => {
  const id = c.req.param('id')
  
  // Optional: Delete file from R2 as well
  // For now, just mark rejected or delete record
  // Let's mark rejected
  await c.env.DB.prepare(`UPDATE resources SET status = 'rejected', updated_at = strftime('%s', 'now') WHERE id = ?`).bind(id).run()
  return c.json({ success: true })
})

// Stats
app.get('/stats', async (c) => {
  const totalDownloads = await c.env.DB.prepare('SELECT SUM(downloads) as total FROM resources').first()
  const totalResources = await c.env.DB.prepare('SELECT COUNT(*) as count FROM resources WHERE status = "approved"').first()
  
  return c.json({
    downloads: totalDownloads?.total || 0,
    resources: totalResources?.count || 0
  })
})

export default app
