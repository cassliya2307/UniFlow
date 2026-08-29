export function calculateLetterGrade(score: number): string {
  if (score >= 70) return 'A'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  if (score >= 45) return 'D'
  if (score >= 40) return 'E'
  return 'F'
}

export function getGradeDescription(grade: string): string {
  const descriptions: Record<string, string> = {
    A: 'Excellent',
    B: 'Good',
    C: 'Satisfactory',
    D: 'Pass',
    E: 'Marginal Pass',
    F: 'Fail'
  }
  return descriptions[grade] || ''
}