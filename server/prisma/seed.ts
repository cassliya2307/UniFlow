import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10)

  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@university.edu' },
    update: {},
    create: {
      name: 'Dr. Sarah Williams',
      email: 'lecturer@university.edu',
      passwordHash,
      role: 'LECTURER'
    }
  })

  const students = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john@student.edu' },
      update: {},
      create: {
        name: 'John Doe',
        email: 'john@student.edu',
        passwordHash,
        role: 'STUDENT'
      }
    }),
    prisma.user.upsert({
      where: { email: 'jane@student.edu' },
      update: {},
      create: {
        name: 'Jane Smith',
        email: 'jane@student.edu',
        passwordHash,
        role: 'STUDENT'
      }
    }),
    prisma.user.upsert({
      where: { email: 'michael@student.edu' },
      update: {},
      create: {
        name: 'Michael Brown',
        email: 'michael@student.edu',
        passwordHash,
        role: 'STUDENT'
      }
    }),
    prisma.user.upsert({
      where: { email: 'emily@student.edu' },
      update: {},
      create: {
        name: 'Emily Davis',
        email: 'emily@student.edu',
        passwordHash,
        role: 'STUDENT'
      }
    })
  ])

  const course = await prisma.course.upsert({
    where: { code: 'SWE301' },
    update: {},
    create: {
      name: 'Software Engineering',
      code: 'SWE301',
      lecturerId: lecturer.id
    }
  })

  await Promise.all(students.map(s =>
    prisma.enrollment.upsert({
      where: { studentId_courseId: { studentId: s.id, courseId: course.id } },
      update: {},
      create: { studentId: s.id, courseId: course.id }
    })
  ))

  const project = await prisma.project.upsert({
    where: { id: 'project-swe301-ecommerce' },
    update: {},
    create: {
      id: 'project-swe301-ecommerce',
      courseId: course.id,
      title: 'E-Commerce Website',
      description: 'Build a full-stack e-commerce website with user authentication, product catalog, shopping cart, and checkout functionality.',
      requirements: '1. User registration and login\n2. Product listing with categories\n3. Shopping cart persistence\n4. Checkout with payment integration (mock)\n5. Order history\n6. Admin dashboard for product management\n7. Responsive design\n8. Unit and integration tests',
      deadline: new Date('2026-09-15T23:59:00Z'),
      submissionType: 'LINK'
    }
  })

  const [john, jane, michael, emily] = students

  await prisma.submission.upsert({
    where: { projectId_studentId: { projectId: project.id, studentId: john.id } },
    update: {},
    create: {
      projectId: project.id,
      studentId: john.id,
      projectUrl: 'https://github.com/johndoe/ecommerce-project',
      submittedAt: new Date('2026-08-20T10:30:00Z'),
      status: 'SUBMITTED'
    }
  })

  await prisma.submission.upsert({
    where: { projectId_studentId: { projectId: project.id, studentId: jane.id } },
    update: {},
    create: {
      projectId: project.id,
      studentId: jane.id,
      projectUrl: 'https://github.com/janesmith/ecommerce-app',
      submittedAt: new Date('2026-08-21T14:15:00Z'),
      score: 85,
      feedback: 'Excellent implementation. Clean code structure, good test coverage. Minor issue with cart persistence on refresh.',
      status: 'PUBLISHED',
      gradedAt: new Date('2026-08-22T09:00:00Z')
    }
  })

  await prisma.submission.upsert({
    where: { projectId_studentId: { projectId: project.id, studentId: michael.id } },
    update: {},
    create: {
      projectId: project.id,
      studentId: michael.id,
      projectUrl: 'https://github.com/michaelbrown/ecommerce',
      submittedAt: new Date('2026-08-22T16:45:00Z'),
      score: 72,
      feedback: 'Good work. Missing admin dashboard and test coverage could be improved.',
      status: 'GRADED',
      gradedAt: new Date('2026-08-23T11:00:00Z')
    }
  })

  await prisma.submission.upsert({
    where: { projectId_studentId: { projectId: project.id, studentId: emily.id } },
    update: {},
    create: {
      projectId: project.id,
      studentId: emily.id,
      status: 'NOT_SUBMITTED'
    }
  })

  console.log('Seed data created successfully!')
  console.log('\nDemo credentials:')
  console.log('Lecturer: lecturer@university.edu / password123')
  console.log('Students: john@student.edu, jane@student.edu, michael@student.edu, emily@student.edu / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })