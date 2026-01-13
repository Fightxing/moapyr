import { Hono } from 'hono'
import { sign, verify } from 'hono/jwt'
import * as OTPAuth from 'otpauth'
import { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// Helper: JWT Secret (reusing AUTH_SECRET as the signing key for simplicity, or use a new JWT_SECRET)
const getJwtSecret = (env: Bindings) => env.AUTH_SECRET

// Helper: Validate TOTP
const validateTotp = (secret: string, token: string) => {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  })
  // Validate returns the delta (0 means current window, null means invalid)
  const delta = totp.validate({ token, window: 1 })
  return delta !== null
}

// 1. LOGIN (Public) - Exchange Username + TOTP for JWT
app.post('/login', async (c) => {
  const { username, code } = await c.req.json()
  
  if (!username || !code) return c.json({ error: 'Missing username or code' }, 400)

  const admin = await c.env.DB.prepare('SELECT * FROM admins WHERE username = ?').bind(username).first()
  
  if (!admin) {
    // Return generic error to avoid user enumeration
    return c.json({ error: 'Invalid credentials' }, 401)
  }

  const isValid = validateTotp(admin.totp_secret as string, code)
  
  if (!isValid) {
    return c.json({ error: 'Invalid code' }, 401)
  }

  // Generate JWT
  const payload = {
    sub: admin.id,
    username: admin.username,
    role: 'admin',
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 24 hours
  }
  
  const token = await sign(payload, getJwtSecret(c.env))
  return c.json({ token })
})

// 2. REGISTER (Protected by Master Secret) - Bootstrap first admin
app.post('/register', async (c) => {
  // Use the old simple auth for bootstrapping new admins
  const masterToken = c.req.header('x-admin-token')
  if (masterToken !== c.env.AUTH_SECRET) {
    return c.json({ error: 'Unauthorized Master Token' }, 401)
  }

  const { username } = await c.req.json()
  if (!username) return c.json({ error: 'Username required' }, 400)

  // Check if exists
  const existing = await c.env.DB.prepare('SELECT 1 FROM admins WHERE username = ?').bind(username).first()
  if (existing) return c.json({ error: 'User already exists' }, 409)

  // Generate new TOTP Secret
  const secret = new OTPAuth.Secret({ size: 20 })
  const secretBase32 = secret.base32

  // Save to DB
  await c.env.DB.prepare('INSERT INTO admins (username, totp_secret) VALUES (?, ?)').bind(username, secretBase32).run()

  // Generate OTP URI for QR Code
  const totp = new OTPAuth.TOTP({
    issuer: 'MOAPYR Resource Station',
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  })
  
  const uri = totp.toString()

  return c.json({ 
    success: true, 
    username, 
    secret: secretBase32, 
    uri: uri,
    message: "Import this URI into Google Authenticator" 
  })
})

// --- MIDDLEWARE ---
// Verify JWT for all subsequent routes
app.use('/*', async (c, next) => {
  // Skip public routes we just defined
  if (c.req.path.endsWith('/login') || c.req.path.endsWith('/register')) {
    return next()
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  const token = authHeader.split(' ')[1]
  
  try {
    await verify(token, getJwtSecret(c.env))
    await next()
  } catch (e) {
    return c.json({ error: 'Invalid Token' }, 401)
  }
})

// --- PROTECTED ROUTES ---

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
