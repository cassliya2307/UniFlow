import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_EXPIRES_IN = '7d'

function getJwtSecret(): string {
  let secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'test') {
      secret = 'test-jwt-secret-must-be-at-least-32-chars-long!!'
    } else {
      throw new Error('JWT_SECRET environment variable is required')
    }
  }
  if (secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters')
  }
  return secret
}

export interface JwtPayload {
  userId: string
  email: string
  name: string
  role: 'STUDENT' | 'LECTURER'
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JwtPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null
  return authHeader.slice(7)
}