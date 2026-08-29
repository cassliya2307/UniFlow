import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import authRoutes from './routes/auth'
import studentRoutes from './routes/student'
import lecturerRoutes from './routes/lecturer'
import { prisma } from './utils/db'

dotenv.config()

if (process.env.NODE_ENV !== 'test') {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters')
  }
}

const app = express()
const PORT = process.env.PORT || 3000

app.set('trust proxy', 1)

app.use(helmet())

// CORS: production requires CLIENT_URL, development falls back to localhost:5173
let corsOrigin: string | string[] | undefined
if (process.env.NODE_ENV === 'production') {
  if (!process.env.CLIENT_URL) {
    throw new Error('CLIENT_URL environment variable is required in production')
  }
  const origins = process.env.CLIENT_URL.split(',').map(s => s.trim()).filter(Boolean)
  corsOrigin = origins.length === 1 ? origins[0] : origins
} else {
  corsOrigin = process.env.CLIENT_URL || 'http://localhost:5173'
}

app.use(cors({
  origin: corsOrigin as any,
  credentials: true
}))

app.use(express.json({ limit: '100kb' }))

// Rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later' }
})

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
})

app.use('/api/', globalLimiter)
app.use('/api/auth/login', loginLimiter)

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  } catch (e) {
    res.status(500).json({ status: 'error', error: 'Database unavailable' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/student', studentRoutes)
app.use('/api/lecturer', lecturerRoutes)

// Serve frontend in production (single-container) — handle both root and server cwd
const candidatePaths = [
  path.resolve(process.cwd(), 'client', 'dist'),
  path.resolve(process.cwd(), '../client', 'dist'),
  path.resolve(__dirname, '../../client/dist')
]
let clientDistPath: string | null = null
for (const p of candidatePaths) {
  if (fs.existsSync(p)) { clientDistPath = p; break }
}
if (clientDistPath) {
  app.use(express.static(clientDistPath))
  // SPA fallback: serve index.html for non-API routes
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(clientDistPath!, 'index.html'))
  })
}

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum 10MB per file.' })
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ error: 'Too many files. Maximum 5 files per submission.' })
  }
  if (err.message && err.message.includes('File type')) {
    return res.status(400).json({ error: err.message })
  }
  res.status(500).json({ error: 'Internal server error' })
})

const server = app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`)
})

server.on('error', (error) => {
  console.error('Server error:', error)
})

function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`)
  server.close(async () => {
    try {
      await prisma.$disconnect()
    } catch (e) {
      console.error('Error disconnecting prisma:', e)
    }
    process.exit(0)
  })
  // Force exit if not closed in 10s
  setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit')
    process.exit(1)
  }, 10000)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})
