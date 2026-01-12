import { Hono } from 'hono'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

// Helper to detect local environment
const isLocal = (env: Bindings) => env.R2_ACCOUNT_ID === 'local_dev'

const getS3Client = (env: Bindings) => {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  })
}

// --- LOCAL DEV HELPERS ---
// This route mimics the S3 bucket behavior for local development
app.all('/local-bucket/:key', async (c) => {
  if (!isLocal(c.env)) {
    return c.json({ error: 'Only available in local dev mode' }, 403)
  }
  const key = c.req.param('key')

  if (c.req.method === 'PUT') {
    const body = await c.req.arrayBuffer()
    await c.env.BUCKET.put(key, body)
    return c.newResponse(null, 200)
  }

  if (c.req.method === 'GET') {
    const object = await c.env.BUCKET.get(key)
    if (!object) return c.newResponse(null, 404)
    return c.newResponse(object.body, 200)
  }

  return c.newResponse(null, 405)
})
// -------------------------

// Search / List Resources
app.get('/', async (c) => {
  const query = c.req.query('q')
  const tag = c.req.query('tag')
  
  let sql = `SELECT * FROM resources WHERE status = 'approved'`
  const params: any[] = []

  if (query) {
    sql += ` AND (title LIKE ? OR description LIKE ?)`
    params.push(`%${query}%`, `%${query}%`)
  }

  if (tag) {
    sql += ` AND tags LIKE ?`
    params.push(`%${tag}%`)
  }

  sql += ` ORDER BY created_at DESC LIMIT 50`

  const { results } = await c.env.DB.prepare(sql).bind(...params).all()
  return c.json({ results })
})

// Get Resource Details
app.get('/:id', async (c) => {
  const id = c.req.param('id')
  const resource = await c.env.DB.prepare('SELECT * FROM resources WHERE id = ?').bind(id).first()
  
  if (!resource) {
    return c.json({ error: 'Resource not found' }, 404)
  }
  
  return c.json(resource)
})

// Initialize Upload
app.post('/init-upload', async (c) => {
  const body = await c.req.json()
  const { title, description, tags, fileName, fileSize } = body
  
  if (!title || !fileName) {
    return c.json({ error: 'Missing required fields' }, 400)
  }

  const id = crypto.randomUUID()
  const fileKey = `${id}-${fileName}`
  
  let uploadUrl: string;

  if (isLocal(c.env)) {
    // Local Dev: Return URL to our local proxy
    const url = new URL(c.req.url)
    uploadUrl = `${url.origin}/api/resources/local-bucket/${fileKey}`
  } else {
    // Production: Generate S3 Presigned URL
    const s3 = getS3Client(c.env)
    const command = new PutObjectCommand({
      Bucket: 'moapyr-files', 
      Key: fileKey,
      ContentType: 'application/octet-stream',
      ContentLength: fileSize
    })
    uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
  }

  // Insert into DB as 'pending'
  await c.env.DB.prepare(
    `INSERT INTO resources (id, title, description, tags, uploader_ip, file_key, file_name, file_size, status) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_upload')`
  ).bind(id, title, description, tags, c.req.header('CF-Connecting-IP') || 'unknown', fileKey, fileName, fileSize).run()

  return c.json({ id, uploadUrl, fileKey })
})

// Finalize Upload (User confirms upload is done)
app.post('/finalize-upload', async (c) => {
  const { id } = await c.req.json()
  
  // Verify record exists
  const resource = await c.env.DB.prepare('SELECT * FROM resources WHERE id = ?').bind(id).first()
  if (!resource) return c.json({ error: 'Not found' }, 404)

  // Verify file exists (Optional)
  try {
    if (isLocal(c.env)) {
      const obj = await c.env.BUCKET.head(resource.file_key as string)
      if (!obj) throw new Error('File missing locally')
    } else {
       // Production check skipped for MVP or implement HeadObjectCommand
    }
  } catch (e) {
    // If file is missing, fail?
  }

  // Update status to 'pending' (ready for review)
  await c.env.DB.prepare(`UPDATE resources SET status = 'pending' WHERE id = ?`).bind(id).run()
  
  return c.json({ success: true })
})

// Download (Get Presigned GET URL)
app.get('/:id/download', async (c) => {
  const id = c.req.param('id')
  const resource: any = await c.env.DB.prepare('SELECT * FROM resources WHERE id = ?').bind(id).first()
  
  if (!resource) return c.json({ error: 'Not found' }, 404)
  
  // Increment stats
  await c.env.DB.prepare('UPDATE resources SET downloads = downloads + 1 WHERE id = ?').bind(id).run()
  await c.env.DB.prepare('INSERT INTO analytics (resource_id, event_type) VALUES (?, ?)').bind(id, 'download').run()

  let downloadUrl: string;

  if (isLocal(c.env)) {
    const url = new URL(c.req.url)
    downloadUrl = `${url.origin}/api/resources/local-bucket/${resource.file_key}`
  } else {
    // Generate Presigned GET URL
    const s3 = getS3Client(c.env)
    const command = new GetObjectCommand({
      Bucket: 'moapyr-files',
      Key: resource.file_key
    })
    downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
  }
  
  return c.json({ downloadUrl })
})

export default app
