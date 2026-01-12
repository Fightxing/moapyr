import { Hono } from 'hono'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Bindings } from '../types'

const app = new Hono<{ Bindings: Bindings }>()

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
  const s3 = getS3Client(c.env)
  
  // Generate Presigned URL for PUT
  const command = new PutObjectCommand({
    Bucket: 'moapyr-files', // This name should match your R2 bucket name in dashboard, or use env var
    Key: fileKey,
    ContentType: 'application/octet-stream', // Or guess from fileName
    ContentLength: fileSize
  })
  
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })

  // Insert into DB as 'pending' (waiting for file)
  // Actually, we'll use a specific status like 'uploading' or just 'pending' but require a finalize step.
  // We'll use 'uploading' for now, or just 'pending' and check file existence later.
  // Let's stick to 'pending' as defined in schema, meaning "Pending Admin Review".
  // But strictly, we shouldn't show it to admin until upload is done.
  // Let's add a `finalized` boolean or just assume if it's in DB it's initialized.
  
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

  // Verify file exists in R2 (Optional but recommended)
  // For MVP, we trust the client or check headObject
  try {
    const s3 = getS3Client(c.env)
    // HEAD request to check object existence would go here
    // await s3.send(new HeadObjectCommand({ Bucket: 'moapyr-files', Key: resource.file_key as string }))
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

  // Generate Presigned GET URL
  const s3 = getS3Client(c.env)
  const command = new GetObjectCommand({
    Bucket: 'moapyr-files',
    Key: resource.file_key
  })
  
  const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 })
  
  return c.json({ downloadUrl })
})

export default app
