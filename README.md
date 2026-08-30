# University Project Portal - MVP

A simple, production-ready university project grading portal built with React, Express, TypeScript, Prisma, and SQLite.

## Features

- **Student**: Login, view assigned projects, submit project URLs, view grades and feedback
- **Lecturer**: Login, view course projects, grade submissions, save drafts, publish results
- **Security**: JWT authentication, role-based authorization, server-side validation
- **Grading**: Score 0-100, automatic letter grade calculation (A-F)

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express + TypeScript
- **Database**: SQLite + Prisma ORM
- **Auth**: JWT + bcrypt
- **Testing**: Vitest + Supertest

## Quick Start

### Prerequisites

- Node.js 20+
- npm

### Development

```bash
# Install dependencies
npm install

# Set up database
cd server
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
cd ..

# Start development servers (client on :5173, server on :3000)
npm run dev
```

### Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Lecturer | lecturer@university.edu | password123 |
| Student | john@student.edu | password123 |
| Student | jane@student.edu | password123 |
| Student | michael@student.edu | password123 |
| Student | emily@student.edu | password123 |

### Production Build

```bash
# Build everything
npm run build

# Start production server
npm start
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run migrations separately (if needed)
docker-compose --profile migrate up migrate
```

## Project Structure

```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context (Auth)
│   │   ├── hooks/          # Custom hooks
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities (API client)
│   └── ...
├── server/                 # Express backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── middleware/     # Auth middleware
│   │   ├── utils/          # Utilities (DB, auth, validation)
│   │   └── test/           # Integration tests
│   └── prisma/
│       ├── schema.prisma   # Database schema
│       └── seed.ts         # Demo data seeding
├── Dockerfile
├── docker-compose.yml
└── package.json            # Root workspace config
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Student
- `GET /api/student/dashboard` - Student dashboard
- `GET /api/student/projects/:projectId` - Project details
- `POST /api/student/projects/:projectId/submit` - Submit project

### Lecturer
- `GET /api/lecturer/dashboard` - Lecturer dashboard
- `GET /api/lecturer/projects/:projectId/submissions` - List submissions
- `GET /api/lecturer/submissions/:submissionId` - View submission
- `PUT /api/lecturer/submissions/:submissionId/grade` - Grade submission
- `PUT /api/lecturer/submissions/:submissionId/publish` - Publish/unpublish grade

## Testing

```bash
# Run server tests
cd server && npm run test
```

## License

MIT
# UniFlow
