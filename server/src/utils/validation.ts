import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const submitProjectSchema = z.object({
  projectUrl: z.string().url().optional().nullable()
})

export const submitProjectWithFilesSchema = z.object({
  projectUrl: z.string().url().optional().nullable(),
  files: z.array(z.any()).optional()
}).refine((data) => {
  // This will be validated server-side based on project's submissionType
  return true
})

export const gradeSubmissionSchema = z.object({
  score: z.number().int().min(0).max(100),
  feedback: z.string().optional().nullable()
})

export const publishGradeSchema = z.object({
  publish: z.boolean()
})

export const createProjectSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  requirements: z.string().optional().nullable(),
  deadline: z.string().refine((val) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:?\d{2})?$/.test(val)
  }, 'Invalid datetime format'),
  submissionType: z.enum(['LINK', 'FILE', 'LINK_AND_FILE']).optional().default('LINK')
})

export const createCourseSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, 'Course code must be uppercase alphanumeric')
})

export const updateProjectSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  requirements: z.string().optional().nullable(),
  deadline: z.string().refine((val) => {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(\.\d{3})?(Z|[+-]\d{2}:?\d{2})?$/.test(val)
  }, 'Invalid datetime format').optional(),
  courseId: z.string().min(1).optional(),
  submissionType: z.enum(['LINK', 'FILE', 'LINK_AND_FILE']).optional()
})

export type LoginInput = z.infer<typeof loginSchema>
export type SubmitProjectInput = z.infer<typeof submitProjectSchema>
export type SubmitProjectWithFilesInput = z.infer<typeof submitProjectWithFilesSchema>
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>
export type PublishGradeInput = z.infer<typeof publishGradeSchema>
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type CreateCourseInput = z.infer<typeof createCourseSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>