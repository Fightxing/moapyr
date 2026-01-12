export type Bindings = {
  DB: D1Database
  BUCKET: R2Bucket
  AUTH_SECRET: string
  R2_ACCOUNT_ID: string
  R2_ACCESS_KEY_ID: string
  R2_SECRET_ACCESS_KEY: string
}

export type Resource = {
  id: string
  title: string
  description: string
  tags: string
  uploader_ip: string
  file_key: string
  file_name: string
  file_size: number
  status: 'pending' | 'approved' | 'rejected'
  downloads: number
  created_at: number
  updated_at: number
}
