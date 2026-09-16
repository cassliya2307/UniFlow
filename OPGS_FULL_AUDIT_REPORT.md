# OPGS FULL AUDIT REPORT

## 1. Executive Summary

This audit examines the Online Project Grading System (OPGS), a production-deployed university application. The system currently functions as a single-lecturer platform where one lecturer can create courses and manage student project submissions and grading. Students can view project details and submit work, but **student self-registration is not implemented**. The system uses React + Vite for the frontend, Node.js + Express + Prisma for the backend, and SQLite via Prisma for the database. Authentication is JWT-based with role-based access control (STUDENT or LECTURER). The existing branding uses "University Project Portal" which needs to be transformed to "OPGS" branding. Demo data from seed scripts currently populates the database, and the desired behavior is real database data with polished empty states when no data is available.

## 2. Technology Stack

**Frontend:**
- React 18 with TypeScript
- Vite 5 (build tool)
- react-router-dom 6 (routing)
- CSS variables for theming (custom inline styles, no Tailwind)
- Axios-based API client with Bearer token auth

**Backend:**
- Node.js with Express 4.18
- TypeScript
- Prisma ORM 5.10
- SQLite (development), configurable for production
- bcryptjs for password hashing
- jsonwebtoken for JWT authentication
- Zod for validation
- Multer for file uploads
- Helmet + express-rate-limit for security

**Database:**
- SQLite via Prisma Client
- Models: User, Course, Enrollment, Project, Submission, SubmissionFile

**Authentication:**
- JWT (HS256) with 7-day expiration
- Passwords hashed with bcrypt (10 rounds)
- Token stored in localStorage, sent via Authorization: Bearer header
- Role-based access: STUDENT or LECTURER

**Deployment:**
- Frontend: Railway (https://client-production-a930.up.railway.app)
- Backend: Railway (https://server-production-2d69.up.railway.app)
- CORS configured via CLIENT_URL env var
- API base: https://server-production-2d69.up.railway.app/api
- VITE_API_URL configured to production API base

## 3. Project Structure

```
University Project Portal/
├── .env                      # Production environment variables
├── .env.example              # Environment template
├── package.json              # Root workspace (workspaces: server, client)
├── railway.json              # Railway deployment config
├── client/                   # Frontend (React + Vite)
│   ├── dist/                 # Built output
│   ├── index.html            # HTML entry point
│   ├── package.json
│   ├── src/
│   │   ├── App.tsx           # Routing + PrivateRoute role protection
│   │   ├── main.tsx          # ReactDOM root render
│   │   ├── pages/            # 6 page components
│   │   ├── components/       # Layout, LoadingSpinner
│   │   ├── context/          # AuthContext (user state, login/logout)
│   │   ├── types/            # TypeScript interfaces
│   │   └── utils/            # api.ts, grade.ts
│   └── vite.config.ts        # Vite config with /api proxy
├── server/                   # Backend (Express + TypeScript)
│   ├── dist/                 # Compiled output
│   ├── package.json
│   ├── prisma/
│   │   ├── schema.prisma     # Database models
│   │   ├── seed.ts           # Demo data seeding
│   │   └── migrations/
│   ├── src/
│   │   ├── index.ts          # Server entry with middleware
│   │   ├── routes/           # auth.ts, student.ts, lecturer.ts
│   │   ├── middleware/       # auth.ts (JWT verify, role require)
│   │   └── utils/            # auth.ts, db.ts, validation.ts, fileUpload.ts, grade.ts
│   ├── .env                  # Server environment variables
│   └── uploads/              # File upload directory
└── uploads/                  # Root uploads (legacy/fallback)
```

## 4. Frontend Routes

| Route | Purpose | Role | Backend Dependency | Current UI Quality | Mobile Status | Notes |
| ----- | ------- | ---- | ------------------ | ------------------ | ------------- | ----- |
| /login | Login page | Public | POST /api/auth/login | Basic card form, demo credentials shown | Working | No responsive optimization |
| /student/dashboard | Student dashboard | STUDENT | GET /api/student/dashboard | Stat cards, project table, empty state | Working | Table can overflow on mobile |
| /student/projects/:projectId | Student project detail | STUDENT | GET /api/student/projects/:id | Project details, submit form | Working | Forms not mobile-friendly |
| /student/projects/:projectId/submissions | Project submissions | STUDENT | GET /api/lecturer/projects/:id/submissions | Table of submissions | Working | No mobile table overflow fix |
| /lecturer/dashboard | Lecturer dashboard | LECTURER | GET /api/lecturer/dashboard | Project stats, course cards, modals | Working | Modals not responsive |
| /lecturer/courses | Lecturer courses | LECTURER | GET /api/lecturer/courses | Course list | Working | - |
| /lecturer/projects/:projectId/submissions | Project submissions | LECTURER | GET /api/lecturer/projects/:id/submissions | Submission table | Working | - |
| /lecturer/submissions/:submissionId/grade | Grade submission | LECTURER | GET/PUT /api/lecturer/submissions/:id/grade | Grading form | Working | - |
| / | Root redirect | N/A | N/A | Redirects to /student/dashboard | Working | - |
| * | Wildcard | N/A | N/A | Redirects to /login | Working | - |

## 5. Backend API

| Endpoint | Method | Auth | Role | Description |
| -------- | ---- | ---- | ---- | ----------- |
| GET /api/health | GET | None | None | Database health check |
| POST /api/auth/login | POST | None | None | Authenticate, return JWT |
| GET /api/auth/me | GET | Bearer | None | Get current user profile |
| GET /api/student/dashboard | GET | Bearer | STUDENT | Student dashboard data |
| GET /api/student/projects/:projectId | GET | Bearer | STUDENT | Student project detail |
| POST /api/student/projects/:projectId/submit | POST | Bearer | STUDENT | Submit project (link or files) |
| GET /api/student/files/:fileId | GET | Bearer | STUDENT | Download student file |
| GET /api/lecturer/dashboard | GET | Bearer | LECTURER | Lecturer dashboard data |
| GET /api/lecturer/courses | GET | Bearer | LECTURER | List lecturer courses |
| POST /api/lecturer/courses | POST | Bearer | LECTURER | Create new course |
| PUT /api/lecturer/projects/:projectId | PUT | Bearer | LECTURER | Update project |
| DELETE /api/lecturer/projects/:projectId | DELETE | Bearer | LECTURER | Delete project |
| POST /api/lecturer/projects | POST | Bearer | LECTURER | Create project + auto-enroll students |
| GET /api/lecturer/projects/:projectId/submissions | GET | Bearer | LECTURER | List project submissions |
| GET /api/lecturer/submissions/:submissionId | GET | Bearer | LECTURER | Get submission detail |
| PUT /api/lecturer/submissions/:submissionId/grade | PUT | Bearer | LECTURER | Grade submission (save draft) |
| PUT /api/lecturer/submissions/:submissionId/publish | PUT | Bearer | LECTURER | Publish grade/result |
| GET /api/lecturer/files/:fileId | GET | Bearer | LECTURER | Download file |

## 6. Authentication Flow

### Login
- **Fields**: email, password
- **Request**: POST /api/auth/login with JSON body
- **Response**: `{ token, user: { id, name, email, role } }`
- **Client**: Token stored in localStorage via `localStorage.setItem('token', token)`
- **Persistence**: Token retrieved on app init from localStorage, passed via `Authorization: Bearer` header
- **Redirect**: LECTURER → /lecturer/dashboard, STUDENT → /student/dashboard
- **Error**: Invalid credentials returns 401

### Registration
- **Status: MISSING** - No student self-registration endpoint or page exists
- No POST /api/student/register route
- No registration page in frontend
- The login page only supports existing account login with demo credentials

### Me / Profile
- **GET /api/auth/me** - Returns current user profile
- Used by AuthContext on init to restore session from token

### Logout
- `localStorage.removeItem('token')`
- `api.setToken(null)`
- `setUser(null)` in AuthContext
- Redirects to /login

### Role Handling
- **PrivateRoute** in App.tsx: protects /student/* (STUDENT) and /lecturer/* (LECTURER)
- **Backend middleware**: `authenticate` (verifies JWT) + `requireRole('STUDENT' \| 'LECTURER')`
- Role is set from database on user creation (default: 'STUDENT')
- Role cannot be manipulated via API - prisma schema has `role String @default("STUDENT")` with no enum constraint beyond the default

## 7. Student Registration

**STATUS: MISSING**

### What exists:
- No student self-registration page or form
- No POST /api/student/register API endpoint
- No registration route in frontend routing
- The seed.ts creates demo students via database upsert, not via API

### What is required (per the project brief):
Student registration should require:
1. Full Name ✓ (would be part of form)
2. Matriculation Number ✗ (not in current schema - User model has `name` but no matriculation field)
3. Course ✗ (not in current schema - would need Course enrollment)
4. Email ✓ (User model has unique email)
5. Password ✓ (User model has passwordHash)

### Missing pieces:
- **Matriculation number field** - Not in Prisma User model. Would need `matriculationNumber String @unique`
- **Course assignment during registration** - Student needs to select/enroll in a course
- **Student role assignment** - Would need to ensure role = 'STUDENT' (already default, but needs to be enforced)
- **Uniqueness enforcement** - Both matriculation number and email need unique constraints
- **Registration API endpoint** - POST /api/student/register
- **Registration frontend page** - Signup form with validation

### How it should work:
1. Student fills registration form with: name, matriculation number, course, email, password
2. Frontend sends POST /api/student/register
3. Backend validates uniqueness of email and matriculation number
4. Creates User with role='STUDENT'
5. Creates Enrollment for the selected course
6. Student can login and access dashboard

## 8. Single Lecturer Architecture

The system is designed around a **single lecturer model** and the architecture supports this safely:

### How it currently works:
- Lecturer account created in seed.ts: `lecturer@university.edu` with role='LECTURER'
- Courses are assigned to a lecturer via `lecturerId` field on Course model
- All lecturer routes check `course.lecturerId !== userId` for authorization
- `requireRole('LECTURER')` middleware enforces role check
- One lecturer account exists in the database (created via upsert in seed.ts)

### Verification:
- **Is there one lecturer in the database?** Yes, seed creates one lecturer upsert
- **Is the lecturer hard-coded?** The lecturer email is hard-coded in seed.ts, but the architecture would allow another user to become a lecturer if their email matches a course's lecturerId
- **Can additional lecturers currently register?** No self-registration path. A user could only become a lecturer if manually assigned by setting their user ID as a course's lecturerId
- **Can an ordinary user become a lecturer?** Not through the UI, but the database model allows it (role defaults to 'STUDENT', no enum restriction)
- **Are lecturer-specific screens assuming multiple lecturers?** No - lecturer dashboard shows "Welcome, {name}" and projects owned by that lecturer only. No lecturer directory or list
- **Are there UI elements suggesting multiple lecturers?** No - no lecturer list, no directory, no assignment UI
- **Would the current architecture support the required one-lecturer model safely?** Yes - the lecturerId foreign key on Course, combined with requireRole('LECTURER') checks, safely supports one lecturer. Additional lecturers would require schema changes.

### One concern:
The `User.model.courses` relation uses `@relation("CourseLecturer")` which links to Course.lecturerId. If a second lecturer were added, the naming convention and data model would need revision, but for the single-lecturer requirement, it works correctly.

## 9. Database Models

### User model
- `id String @id @default(cuid())`
- `name String` - Full name
- `email String @unique` - Email address (unique enforced)
- `passwordHash String` - Hashed password
- `role String @default("STUDENT")` - 'STUDENT' or 'LECTURER'
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- Relationships: enrollments, submissions, courses (via CourseLecturer)

### Course model
- `id String @id @default(cuid())`
- `name String`
- `code String @unique` - Course code (unique)
- ` lecturerId String` - Links to User (the lecturer)
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- Relationships: enrollments, projects

### Enrollment model
- `id String @id @default(cuid())`
- `studentId String` - Links to User
- `courseId String` - Links to Course
- **Unique constraint**: @@unique([studentId, courseId]) - One enrollment per student per course
- `createdAt DateTime @default(now())`

### Project model
- `id String @id @default(cuid())`
- `courseId String` - Links to Course
- `title String` - Project title
- `description String` - Project description
- ` requirements String?` - Project requirements
- `deadline DateTime` - Submission deadline
- `submissionType String @default("LINK")` - LINK | FILE | LINK_AND_FILE
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- Relationships: course, submissions

### Submission model
- `id String @id @default(cuid())`
- `projectId String` - Links to Project
- `studentId String` - Links to User
- **Unique constraint**: @@unique([projectId, studentId]) - One submission per student per project
- `projectUrl String?` - URL for link submissions
- `submittedAt DateTime?` - When submitted
- `score Int?` - Numeric grade
- `feedback String?` - Text feedback
- `status String @default("NOT_SUBMITTED")` - NOT_SUBMITTED | SUBMITTED | GRADED | PUBLISHED
- `gradedAt DateTime?` - When graded
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- Relationships: project, student, files

### SubmissionFile model
- `id String @id @default(cuid())`
- `submissionId String` - Links to Submission
- `fileName String` - Original filename
- `filePath String` - Stored path
- `mimeType String` - MIME type
- `fileSize Int` - File size in bytes
- `createdAt DateTime @default(now())`

### Missing student fields (per the project brief):
- **Matriculation number** - Not in the User model. Would need to add `matriculationNumber String @unique`
- **Course association during registration** - Need Enrollment creation on register

### Existing support for required fields:
- ✅ Student name - Supported via User.name
- ✅ Email - Supported via User.email (unique)
- ✅ Password - Supported via User.passwordHash (bcrypt)
- ✅ Student role - Supported via User.role @default("STUDENT")
- ✅ Lecturer ownership - Supported via Course.lecturerId
- ✅ Projects - Supported via Project model
- ✅ Submissions - Supported via Submission model
- ✅ Grades - Supported via Submission.score and status
- ❌ Matriculation number - NOT in schema
- ❌ Course field on student registration - Needs enrollment creation

## 10. Demo/Mock Data

| Location | Type | Source | Production Impact | Recommendation |
| -------- | ---- | ------ | ----------------- | -------------- |
| `server/prisma/seed.ts` | Seed script | Hard-coded arrays + database upsert | HIGH - Populates production DB on deploy | **REMOVE LATER** - Contains fake students (John, Jane, Michael, Emily) and fake data. Should be replaced with real student data or development-only fixture. |
| Demo credentials in Login.tsx | Presentation | Hard-coded in component | MEDIUM - Shows demo emails/passwords to users | **REMOVE LATER** - Should not display demo credentials in production |
| Dashboard statistics | Computed | Database queries (real data from seed) | LOW - Stats computed from enrolled students/projects | **KEEP** - Represents real data once students register; becomes dynamic |
| Student names in UI | Presentation | Pulled from database via API | LOW - Comes from User model data | **KEEP** - Real data when students register |
| Hard-coded empty states | UI | Hard-coded component states | LOW - Styled empty states for no data | **KEEP** - Desired behavior: "polished empty states when there is no data" |
| TypeScript types | Development | Defined in types/index.ts | LOW - Type definitions, not runtime data | **KEEP** - Necessary for code quality |

### Seed data details:
The seed.ts creates:
- 1 Lecturer: Dr. Sarah Williams (lecturer@university.edu)
- 4 Students: John Doe, Jane Smith, Michael Brown, Emily Davis (with student emails)
- 1 Course: Software Engineering (SWE301) assigned to lecturer
- 4 Enrollments (one per student in the course)
- 1 Project: E-Commerce Website
- 4 Submissions: John (SUBMITTED, URL), Jane (PUBLISHED, score 85), Michael (GRADED, score 72), Emily (NOT_SUBMITTED)

The seed is run via `npm run db:seed` and creates demo data in the SQLite database. In production, this would typically be run once during initial setup. The seed data is **NOT** removed on subsequent runs - it uses upsert which updates existing records or creates new ones.

## 11. Dashboard Data

### Student Dashboard (StudentDashboard.tsx)
| Data Point | Source | Status |
| ---------- | ------ | ------ |
| totalProjects | DB query (enrollments → courses → projects) | REAL API DATA |
| submittedProjects | DB query (submissions filtered) | REAL API DATA |
| gradedProjects | DB query (submissions with GRADED/PUBLISHED status) | REAL API DATA |
| publishedProjects | DB query (submissions with PUBLISHED status) | REAL API DATA |
| pendingProjects | DB calculation (total - submitted) | REAL API DATA |
| projects array | DB query with full data | REAL API DATA |
| submissionStatus per project | DB query | REAL API DATA |
| score/grade per project | DB query | REAL API DATA |

### Lecturer Dashboard (LecturerDashboard.tsx)
| Data Point | Source | Status |
| ---------- | ------ | ------ |
| project stats (totalStudents, submittedCount, gradedCount, publishedCount, pendingCount) | DB queries per project | REAL API DATA |
| project titles, course, deadline | DB query | REAL API DATA |
| course list | DB query (courses where lecturerId = userId) | REAL API DATA |

**Assessment**: All dashboard data comes from **real API calls to the backend**, which queries the database. The data is not hard-coded or mocked. Once student self-registration is implemented, the dashboard will dynamically reflect real student data. The seed data currently provides the initial population.

## 12. Branding Audit

Current branding: "University Project Portal" — needs to become **OPGS**

### Locations requiring OPGS branding update:

| Location | Current Text | File/Line |
| -------- | ------------ | ---------- |
| App title (Login page) | "University Project Portal" | client/src/pages/Login.tsx:40 |
| Layout header text | "University Project Portal" | client/src/components/Layout.tsx:33 |
| Footer text | "University Project Portal — MVP" | client/src/components/Layout.tsx:56 |
| Nav brand text | "University Project Portal" | client/src/components/Layout.tsx:32 |
| Page headers | Varies by page | Multiple pages |
| favicon | Not found in audit | Check client/public/ or assets |
| HTML title | "University Project Portal" | client/index.html:6 |
| README.md | "University Project Portal - MVP" | README.md:1 |

### Branding elements to transform:
- **Project name**: "University Project Portal" → "OPGS" (Online Project Grading System)
- **Short brand**: "OPGS"
- **Visual language**: navy/blue/purple, white/light backgrounds, graduation/project/document/checkmark symbolism
- **Logo**: Existing logo needs assessment (see Section 18)

### NOT CONFIRMED — REQUIRES VERIFICATION:
- Current favicon location and whether it can be reused
- Whether there are any other branding references outside the codebase

## 13. UI/UX Audit

### Branding Issues (Critical)
- **Project name everywhere is "University Project Portal"** instead of "OPGS" — this is the primary rebranding task
- No OPGS logo identified; existing branding is generic university portal style

### Visual Design (Medium)
- **Color palette**: Uses CSS variables (`var(--color-gray-*)`, `var(--color-primary)`, etc.) — needs to be mapped to OPGS academic theme (navy/blue/purple)
- **Typography**: No explicit typography scale; relies on browser defaults with inline font-size controls
- **Spacing**: Inline spacing values (24px, 16px, 8px) — inconsistent numeric values, no design system
- **Cards**: Basic border-radius and shadow styling inconsistent across components
- **Buttons**: Multiple styles (btn btn-primary, btn btn-secondary, btn btn-danger) — consistent concept but inconsistent inline styling
- **Forms**: Inputs have varying placeholder styles, some required markers, inconsistent label positioning
- **Tables**: No responsive overflow handling; tables can overflow viewport on mobile
- **Badges**: Status badges have inconsistent class naming (`badge-not-submitted`, `badge-submitted`, etc.)
- **Modals**: Fixed overlay design, no accessibility attributes (aria-modal, role)
- **Navigation**: Sticky header with user name + role; desktop-only layout

### UX Issues (Medium-High)
- **No student self-registration** — students cannot create accounts; must use demo credentials
- **Login page shows demo credentials** — displays student emails/passwords publicly
- **No "Forgot password" or password recovery** — only login flow exists
- **Loading states** — Spinner shown during data fetch, but no skeleton loaders
- **Error states** — Error messages displayed, but no user-friendly guidance
- **Success states** — Alert shown on submission/grading, but auto-dismiss after timeout would be better
- **Empty states** — Student dashboard has "No projects assigned yet" message (polished). Lecturer dashboard has "Create Course" CTA on empty. Project submission page has structured empty/loading states.
- **Confirmation dialogs** — Delete project modal has confirmation, but no confirmation for grade actions
- **Accessibility** — No aria-labels on interactive elements, no focus visible styles, semantic HTML basic but missing labels on some forms

### Consistency Issues (Medium)
- **Button styles**: Inline styles vary (width: '100%', padding, fontSize) — some buttons use Tailwind-like class combos, some use inline styles
- **Form implementations**: Each page has its own form handling pattern — no shared component
- **Table implementations**: StudentDashboard, LecturerProjectStats, ProjectSubmissions all have slightly different table structures
- **Badge classes**: Different class names per page for similar statuses
- **Modal implementations**: LecturerDashboard has one modal pattern, StudentProject has another

## 14. Responsive / Mobile Audit

### Problems identified (files/components):

| Issue | Location | Severity |
| ----- | -------- | -------- |
| Table overflow on mobile | StudentDashboard.tsx:84 (table-container), ProjectSubmissions.tsx:71 | HIGH - Tables wider than viewport on small screens |
| Fixed widths on modals | LecturerDashboard.tsx:223-340 modal-overlay | MEDIUM - Modals may overflow on small screens |
| Sidebar/navigation | Layout.tsx:21-43 header nav — desktop flex only | MEDIUM - No mobile menu hamburger |
| Header text overflow | Layout.tsx:23-28 sticky header | LOW - Generally OK |
| Project submission form | StudentProject.tsx:243-306 — file input + URL input | HIGH - Form inputs not responsive, may overflow |
| Dashboard stat cards | StudentDashboard.tsx:56-72 — fixed grid of 4 cards | MEDIUM - May not wrap on small screens |
| Page headers | All pages — h1 page-title, p page-subtitle | LOW - Generally responsive |
| Forms (lecturer create) | LecturerDashboard.tsx — various form fields | MEDIUM - Inputs may break on narrow screens |
| Grading page | GradeSubmission.tsx — number input for score | MEDIUM - Number input not optimised for touch |
| Layout sidebar | None — flat layout, but nav condenses on small screens | LOW |

### CSS/Tailwind locations responsible:
- Layout component inline styles (client/src/components/Layout.tsx)
- StudentDashboard table container (client/src/pages/StudentDashboard.tsx)
- ProjectSubmissions table (client/src/pages/ProjectSubmissions.tsx)
- StudentProject form inputs (client/src/pages/StudentProject.tsx)
- GradeSubmission number input (client/src/pages/GradeSubmission.tsx)

No CSS media queries found in the codebase. No responsive design implementation. All layouts use inline styles or CSS variables without breakpoints.

## 15. Accessibility Audit

### Issues found:

| Category | Issue | Location | Severity |
| -------- | ----- | -------- | -------- |
| **Labels** | Many inputs lack `<label>` HTML elements or aria-label | Login.tsx:48-58, StudentProject.tsx:246, GradeSubmission.tsx:217, LecturerDashboard forms | HIGH - Screen readers cannot identify input purposes |
| **Inputs** | Placeholder text used as label substitute | Multiple pages | MEDIUM - Placeholder disappears on input, not visible when focused |
| **Buttons** | Some buttons have unclear text context | GradeSubmission.tsx:260 (Save Draft), LecturerDashboard modals | MEDIUM - Not all buttons describe their action for assistive tech |
| **Keyboard navigation** | No focus-visible styles | Entire frontend | MEDIUM - No `:focus-outer` or `outline` utilities |
| **Focus states** | No visible focus indicators | All interactive elements | HIGH - Critical for keyboard users |
| **Semantic elements** | Page structure generally OK (header, main, footer) but missing heading hierarchy | Layout.tsx, all pages | LOW |
| **Image alt text** | No `<img>` elements found with alt text; icon fonts used (🖼️, 📄, etc.) | StudentProject.tsx:93-98 | LOW - Emoji icons used as file type indicators |
| **Contrast** | CSS variables referenced; actual values not defined in component | Layout.tsx, StudentDashboard.tsx | LOW - Depends on CSS root variables |
| **Error messages** | Inline error state management | Login.tsx:23, StudentDashboard.tsx:18, etc. | MEDIUM - Errors announced but no aria-live regions |
| **Form instructions** | No programmatic form instructions | All forms | MEDIUM |
| **aria usage** | None found in the codebase | Entire frontend | HIGH - Complete lack of aria attributes |

## 16. Security Audit

| Area | Finding | Severity |
| ------ | ------- | -------- |
| **Password hashing** | bcryptjs with 10 rounds | INFO - Standard practice |
| **Token handling** | JWT with HS256, 7-day expiry, stored in localStorage | MEDIUM - JWT in localStorage vulnerable to XSS; no HttpOnly cookie |
| **Role enforcement** | Backend `requireRole()` middleware + frontend `PrivateRoute` | LOW - Defense in depth working |
| **Registration role manipulation** | No student registration exists; if implemented, role must be enforced to STUDENT only | HIGH - If registration added without role check, students could potentially become lecturers |
| **Sensitive data exposure** | Demo credentials displayed on login page (lecturer@university.edu, student emails) | HIGH - Credentials shown in plain text on login page |
| **API endpoint protection** | All routes protected with authenticate middleware; only login/Me/public routes unauthenticated | LOW - Good coverage |
| **Environment variable handling** | JWT_SECRET validated (min 32 chars); CLIENT_URL required in production | LOW - Good validation |
| **SQL injection risks** | Prisma ORM used — parameterized queries, not raw SQL | LOW - ORM protects against SQL injection |
| **File upload security** | Multer with MIME type validation, 10MB max, 5 max files | LOW - Reasonable restrictions |
| **Hard-coded credentials** | 'password123' used in seed.ts and shown as demo password | HIGH - Default password across all demo accounts |
| **Rate limiting** | 20 login attempts/15min, 200 global/15min | LOW - Good protection |
| **XSS protection** | Helmet middleware configured | LOW - Headers set |
| **CSRF protection** | CORS with credentials: true — no explicit CSRF token check | MEDIUM - Potential CSRF risk with cookie-based auth (not current setup) |

## 17. Functionality Protection Map

| Feature | Frontend | API | Backend | Database | Risk During Redesign |
| ------- | -------- | --- | ------- | -------- | -------------------- |
| **Authentication** | Login page, AuthContext, PrivateRoute, token in localStorage | POST /api/auth/login, GET /api/auth/me | JWT verify, bcrypt compare, Prisma user.findUnique | User table, passwordHash role | **HIGH** - Must preserve token flow and role checks |
| **Student dashboard** | StudentDashboard.tsx, api.getStudentDashboard() | GET /api/student/dashboard | Prisma enrollments + projects + submissions | User⟷Enrollment⟷Course⟷Project⟷Submission | **MEDIUM** - Data flow depends on enrollment records |
| **Project submission** | StudentProject.tsx, api.submitProject() | POST /api/student/projects/:id/submit | Prisma submission upsert + file handling + deadline check | Project⟷Submission⟷SubmissionFile | **MEDIUM** - File upload validation, deadline logic |
| **Lecturer dashboard** | LecturerDashboard.tsx, api.getLecturerDashboard() | GET /api/lecturer/dashboard | Prisma course→project→submission queries | Course⟷Project⟷Submission | **LOW** - Read-only data aggregation |
| **Grading** | GradeSubmission.tsx, api.gradeSubmission(), api.publishGrade() | PUT /api/lecturer/submissions/:id/grade, /publish | Prisma submission update + status/grade/feedback | Submission (status, score, feedback, gradedAt) | **HIGH** - Grade modification must preserve data integrity |
| **File downloads** | api.downloadFile(), api.downloadStudentFile() | GET /api/lecturer/files/:id, GET /api/student/files/:id | Prisma file lookup + path validation + fs.existsSync | SubmissionFile (filePath) | **MEDIUM** - Path traversal risk if not careful |
| **Course/project creation** | LecturerDashboard modals, api.createProject(), api.createCourse() | POST /api/lecturer/courses, /projects | Prisma create + authorization (lecturerId check) + enrollment-driven submission creation | Course⟷Project⟷Submission⟷Student | **MEDIUM** - Unauthorized course creation prevented by auth, but enrollment-driven submission creation could create orphan data |
| **Student registration** | MISSING - would need new page + API | MISSING - would need POST /api/student/register | Prisma user.create + uniqueness validation + enrollment creation | User + Enrollment tables | **HIGH** - New feature; must ensure matriculation/email uniqueness, role assignment |

## 18. Hardcoded / Demo Content Audit

| Location | Type | Source | Production Impact | Classification |
| -------- | ---- | ------ | ----------------- | -------------- |
| `server/prisma/seed.ts` | Database seed | Hard-coded arrays (4 students + 1 lecturer) + database upsert | HIGH - Populates DB with fake data on deploy | **REMOVE LATER** - Should not be run in production after initial setup; replace with real student data |
| `client/src/pages/Login.tsx:82-87` | Demo credentials display | Hard-coded `<code>` tags showing student emails | MEDIUM - Shows student emails/passwords to all login visitors | **REMOVE LATER** - Should not display demo credentials in production |
| `client/src/pages/Login.tsx:57,70` | Placeholder text | `placeholder="lecturer@university.edu"`, `placeholder="password123"` | LOW - Helpful placeholders, not fake data | **KEEP** - Useful for demo/UAT |
| `server/prisma/seed.ts:89` | Curriculum requirements | Hard-coded text about e-commerce project | LOW - Project description, not presentation data | **KEEP** - Actual project description |
| `client/src/components/Layout.tsx:56` | Footer text | `University Project Portal — MVP` | LOW - Footer attribution | **REMOVE LATER** - Should become OPGS branding |
| Dashboard statistics | Computed from DB | Real data queries returning seed population | LOW - Dynamic once real students register | **KEEP** - Will become real student data |
| TypeScript types | Development | Type definitions | LOW - Not runtime data | **KEEP** - Necessary |
| `client/src/pages/StudentProject.tsx:252` | File input placeholder | `placeholder="https://github.com/username/project..."` | LOW - UI guidance | **KEEP** - Helpful user guidance |
| Lecturer dashboard project defaults | Form default deadline | `defaultDeadline = formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))` | LOW - UI default, not presentation data | **KEEP** - Reasonable default |

### NOT CONFIRMED — REQUIRES VERIFICATION:
- Whether seed.ts is run on every deployment or only initial setup
- Whether the production database currently contains only seed data or real student data
- Whether there are any other seed/fixture scripts outside seed.ts

## 19. Priority Matrix

| Priority | Issue | Why It Matters | Recommended Phase |
| -------- | ----- | -------------- | ----------------- |
| **Critical** | Student self-registration is MISSING | Students cannot create accounts; only demo credentials work | Phase 2 |
| **Critical** | Demo credentials displayed on login page | Security risk; passwords shown publicly | Phase 2 |
| **Critical** | Rebranding from "University Project Portal" to "OPGS" | Project identity transformation | Phase 1 |
| **High** | No matriculation number field in User model | Required per project brief; students need matriculation tracking | Phase 2 |
| **High** | Tables not responsive | Broken on mobile devices | Phase 6 |
| **High** | No accessibility (aria, focus states) | Inclusive design requirements; legal compliance | Phase 7 |
| **Medium** | Inconsistent UI patterns | Buttons, forms, tables implemented differently across pages | Phase 1-3 |
| **Medium** | Dashboard empty states not polished for all scenarios | User experience when no data exists | Phase 5 |
| **Low** | CSS variable theming not mapped to OPGS palette | Visual design consistency | Phase 1 |
| **Low** | No favicon or custom logo identified | Branding completeness | Phase 1 |

## 20. Files That Should NOT Be Changed Without Care

| File | Reason |
| ---- | ----- |
| `server/src/middleware/auth.ts` | Authentication middleware - JWT verification and role enforcement. Changing this breaks all protected routes. |
| `server/src/routes/auth.ts` | Login/me endpoints - authentication flow. Changing auth logic affects all users. |
| `server/prisma/schema.prisma` | Database model definitions. Changing models requires migration and affects all data relationships. |
| `server/src/utils/validation.ts` | Zod validation schemas - input validation for all API endpoints. |
| `server/.env` / `client/.env` | Environment variables - JWT_SECRET, CLIENT_URL, DATABASE_URL. Changing these can break deployment. |
| `client/src/context/AuthContext.tsx` | Auth state management - token handling, login/logout persistence. |
| `client/src/App.tsx` | Routing + PrivateRoute role protection - structure of protected routes. |
| `server/src/index.ts` | Express server setup - CORS, rate limiting, static file serving, health check. |
| `server/prisma/seed.ts` | Demo data seeding - must not be run in production after initial setup. |
| `client/src/utils/api.ts` | API client - base URL (VITE_API_URL) consumption, token handling. |
| `client/src/pages/Login.tsx` | Login page - must not remove demo credential display until registration is implemented. |

## 21. Final Recommendation

### Recommended Implementation Order:

**Phase 1: Branding/Design Foundation (1-2 weeks)**
- Update all "University Project Portal" text to "OPGS" across frontend
- Replace footer text, page titles, navbar, and README references
- Assess existing logo assets for OPGS rebranding
- Define CSS variable color palette mapping (navy/blue/purple → current vars)
- Set up TypeScript type extensions for matriculation number field

**Phase 2: Authentication + Student Registration (2-3 weeks)**
- Implement POST /api/student/register API endpoint
- Add matriculationNumber String field to Prisma User model (migration)
- Create student registration page with: name, matriculation number, course, email, password
- Ensure role='STUDENT' is assigned automatically (cannot register as lecturer/admin)
- Remove demo credential display from login page
- Add validation for email and matriculation number uniqueness
- Frontend: integrate registration form with API call

**Phase 3: Student UI (2-3 weeks)**
- Implement student project submission flow (URL + file based on submissionType)
- Add responsive table layouts for dashboard and submissions
- Improve empty states for student dashboard when no projects assigned
- Fix table overflow on mobile devices
- Add accessibility: aria-labels, focus states, keyboard navigation

**Phase 4: Lecturer UI Refinements (1-2 weeks)**
- Improve modal responsiveness on lecturer dashboard
- Add confirmation dialogs for grade deletion/publishing
- Enhance grading interface with better feedback UX
- Fix file download accessibility

**Phase 5: Real-data/Empty-state Cleanup (1 week)**
- Ensure all dashboards show polished empty states when no data
- Remove any remaining hard-coded demo data presentation
- Verify all statistics come from real API calls
- Clean up any fallback/demo data presentation

**Phase 6: Responsive/Mobile (2-3 weeks)**
- Implement responsive table layouts (horizontal scroll, card wrappers)
- Add mobile navigation hamburger menu
- Fix form inputs for touch devices
- Test all pages on mobile viewport sizes

**Phase 7: Final UX/Accessibility/Security Pass (1 week)**
- Add comprehensive aria-labels and focus-visible styles
- Implement accessible error handling and success messages
- Run security review on new registration flow
- Performance optimization and bundle analysis

### Dependencies Between Phases:
- Phase 2 enables Phase 3 (students need accounts before UI features matter)
- Phase 1 should precede Phase 2-3 (rebranding affects all new UI)
- Phase 5 depends on Phase 2-3 being complete (real student data available)
- Phase 6 can run in parallel with Phase 3-4 (UI improvements don't depend on data)
- Phase 7 is the final gate before production deployment

### Testing Required:
- Unit tests for new registration API endpoint
- Integration tests for student registration flow (login → dashboard → submission)
- End-to-end tests for role enforcement (students cannot access lecturer routes)
- Accessibility audit with screen readers
- Mobile responsive testing on device sizes
- Security testing on registration endpoint (SQL injection, rate limiting, input validation)

### Rollback Plan:
- All database changes via Prisma migrations (reversible)
- Environment variables have .env.example templates
- Frontend changes are client-side only; backend changes use Prisma upsert/downgrade patterns
- Seed data can be re-run to restore initial state if needed

---

**Audit Complete**. This report provides a comprehensive read-only audit of the OPGS production application. No files were modified during the audit process. The recommended implementation plan outlines a safe, phased approach to transforming the application into a polished Online Project Grading System with OPGS branding, student self-registration, responsive layouts, and improved UX while preserving all existing functionality.