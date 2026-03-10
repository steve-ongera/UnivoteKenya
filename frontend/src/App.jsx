import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import './styles/style.css';

// Pages
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';

// Student
import StudentDashboard from './pages/student/Dashboard';
import VotePage from './pages/student/Vote';
import LiveResults from './pages/student/Results';

// IEBC
import IEBCDashboard from './pages/iebc/Dashboard';
import IEBCStudents from './pages/iebc/Students';
import VoterRegistrations from './pages/iebc/VoterRegistrations';
import IEBCElections from './pages/iebc/Elections';
import IEBCCandidates from './pages/iebc/Candidates';
import IEBCResults from './pages/iebc/Results';

// Route guards
const RequireAuth = ({ children, roles }) => {
  const { isAuth, user } = useAuth();
  if (!isAuth) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user?.role)) return <Navigate to="/" replace />;
  return children;
};

const GuestOnly = ({ children }) => {
  const { isAuth, user } = useAuth();
  if (isAuth) {
    if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user?.role === 'iebc') return <Navigate to="/iebc/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }
  return children;
};

const RootRedirect = () => {
  const { isAuth, user } = useAuth();
  if (!isAuth) return <Navigate to="/login" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'iebc') return <Navigate to="/iebc/dashboard" replace />;
  return <Navigate to="/student/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* Public */}
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/reset-password/:uidb64/:token" element={<ResetPassword />} />

      {/* Student */}
      <Route path="/student/dashboard" element={<RequireAuth roles={['student']}><StudentDashboard /></RequireAuth>} />
      <Route path="/student/vote" element={<RequireAuth roles={['student']}><VotePage /></RequireAuth>} />
      <Route path="/student/results" element={<RequireAuth roles={['student']}><LiveResults /></RequireAuth>} />

      {/* IEBC */}
      <Route path="/iebc/dashboard" element={<RequireAuth roles={['iebc','admin']}><IEBCDashboard /></RequireAuth>} />
      <Route path="/iebc/students" element={<RequireAuth roles={['iebc','admin']}><IEBCStudents /></RequireAuth>} />
      <Route path="/iebc/voter-regs" element={<RequireAuth roles={['iebc','admin']}><VoterRegistrations /></RequireAuth>} />
      <Route path="/iebc/elections" element={<RequireAuth roles={['iebc','admin']}><IEBCElections /></RequireAuth>} />
      <Route path="/iebc/candidates" element={<RequireAuth roles={['iebc','admin']}><IEBCCandidates /></RequireAuth>} />
      <Route path="/iebc/results" element={<RequireAuth roles={['iebc','admin']}><IEBCResults /></RequireAuth>} />
      <Route path="/iebc/results/:id" element={<RequireAuth roles={['iebc','admin']}><IEBCResults /></RequireAuth>} />

      {/* Admin — same IEBC pages but with admin role */}
      <Route path="/admin/dashboard" element={<RequireAuth roles={['admin']}><IEBCDashboard /></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}