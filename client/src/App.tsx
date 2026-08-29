import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import StudentDashboard from './pages/StudentDashboard'
import StudentProject from './pages/StudentProject'
import LecturerDashboard from './pages/LecturerDashboard'
import ProjectSubmissions from './pages/ProjectSubmissions'
import GradeSubmission from './pages/GradeSubmission'
import Layout from './components/Layout'
import LoadingSpinner from './components/LoadingSpinner'

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: ('STUDENT' | 'LECTURER')[] }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function StudentRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="projects/:projectId" element={<StudentProject />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

function LecturerRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="dashboard" element={<LecturerDashboard />} />
        <Route path="projects/:projectId/submissions" element={<ProjectSubmissions />} />
        <Route path="submissions/:submissionId/grade" element={<GradeSubmission />} />
        <Route path="" element={<Navigate to="dashboard" replace />} />
      </Routes>
    </Layout>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/student/*"
        element={
          <PrivateRoute allowedRoles={['STUDENT']}>
            <StudentRoutes />
          </PrivateRoute>
        }
      />
      <Route
        path="/lecturer/*"
        element={
          <PrivateRoute allowedRoles={['LECTURER']}>
            <LecturerRoutes />
          </PrivateRoute>
        }
      />
      <Route path="/" element={<Navigate to="/student/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App