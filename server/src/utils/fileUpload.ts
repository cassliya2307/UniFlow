import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'))

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const MAX_FILES = parseInt(process.env.MAX_FILES || '5', 10)

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
  'application/zip',
  'image/jpeg',
  'image/png',
  'text/markdown',
  'text/plain'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    const uniqueName = `${uuidv4()}${ext}`
    cb(null, uniqueName)
  }
})

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`File type ${file.mimetype} is not allowed`))
  }
  cb(null, true)
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES
  }
})

export const ALLOWED_MIME_TYPES_LIST = ALLOWED_MIME_TYPES
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE
export const UPLOAD_DIR_PATH = UPLOAD_DIR
export const MAX_FILES_LIMIT = MAX_FILES