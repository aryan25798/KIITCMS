import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Spinner from './components/ui/Spinner'; // Must be a static import for the fallback

// --- Lazy Load Pages ---
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

// --- Lazy Load Feature Components ---
const VerifyEmail = lazy(() => import('./features/auth/VerifyEmail'));
// NEW: Generic Pending/Rejected Screen replaces the old PendingMentor
const PendingApproval = lazy(() => import('./features/auth/PendingApproval')); 

// Student Features
const ComplaintList = lazy(() => import('./features/complaints/ComplaintList'));
const ComplaintForm = lazy(() => import('./features/complaints/ComplaintForm'));
const StudentMarketplace = lazy(() => import('./features/marketplace/StudentMarketplace'));
const LostAndFoundPortal = lazy(() => import('./features/lostAndFound/LostAndFoundPortal'));
const MentorPortal = lazy(() => import('./features/mentorship/MentorPortal'));
const HostelLeavePortal = lazy(() => import('./features/leave/HostelLeavePortal'));
const FAQ = lazy(() => import('./features/knowledgeBase/FAQ'));
const StudentTimetable = lazy(() => import('./features/timetable/StudentTimetable'));
const NewsPage = lazy(() => import('./features/news/NewsPage'));

// Mentor Features
const MentorDashboard = lazy(() => import('./features/mentorship/MentorDashboard'));

// Admin & Department Features
const AnalyticsDashboard = lazy(() => import('./features/complaints/AnalyticsDashboard'));
const UserManagement = lazy(() => import('./features/knowledgeBase/UserManagement'));
const MentorApproval = lazy(() => import('./features/mentorship/MentorApproval'));
const KnowledgeBaseManagement = lazy(() => import('./features/knowledgeBase/KnowledgeBaseManagement'));
const LeaveManagement = lazy(() => import('./features/leave/LeaveManagement'));
const TimetableUpload = lazy(() => import('./features/admin/TimetableUpload'));
const EmergencyLog = lazy(() => import('./features/admin/EmergencyLog'));
const AdminChatPortal = lazy(() => import('./features/chat/AdminChatPortal'));

// --- ERROR BOUNDARY COMPONENTS ---

// 1. Fallback UI
const ErrorFallback = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-white p-4">
        <div className="bg-slate-900 border border-red-500/20 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-slate-400 mb-6">The application encountered an unexpected error. Please try refreshing the page.</p>
            <button 
                onClick={() => window.location.reload()}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors shadow-lg shadow-red-500/20"
            >
                Reload Page
            </button>
        </div>
    </div>
);

// 2. Class-Based Error Boundary
class GlobalErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI.
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service here
        console.error("Uncaught error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <ErrorFallback />;
        }

        return this.props.children; 
    }
}

// --- HELPER COMPONENTS ---

// Helper for wrapping components in Suspense
const Suspended = ({ children }) => (
    <Suspense fallback={
        <div className="flex items-center justify-center h-full w-full min-h-[50vh]">
            <Spinner color="border-cyan-400" />
        </div>
    }>
        {children}
    </Suspense>
);

// Protects routes that require a logged-in user
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <Spinner />; // Use spinner while checking auth
    return user ? children : <Navigate to="/login" />;
}

// Protects routes based on user role
function RoleRoute({ roles, children }) {
    const { role } = useAuth();
    return roles.includes(role) ? children : <Navigate to="/portal/dashboard" />;
}

// Main Router Component
function AppRoutes() {
    const { user, role, isAwaitingVerification, handleLogout, handleResendVerification, resendStatus } = useAuth();

    // 1. Email Verification Gate (Existing)
    if (isAwaitingVerification) {
        return (
            <Suspended>
                <VerifyEmail user={user} onResend={handleResendVerification} onBackToLogin={handleLogout} resendStatus={resendStatus} />
            </Suspended>
        );
    }

    // 2. NEW: Admin Approval Gate
    // This catches both Students and Mentors who are in 'pending' status
    if (role === 'pending_approval') {
        return (
            <Suspended>
                <PendingApproval status="pending" onLogout={handleLogout} />
            </Suspended>
        );
    }

    // 3. NEW: Rejection Gate
    // This catches users who have been explicitly rejected by Admin
    if (role === 'rejected_user') {
        return (
            <Suspended>
                <PendingApproval status="rejected" onLogout={handleLogout} />
            </Suspended>
        );
    }
    
    return (
        <Routes>
            <Route path="/" element={
                !user ? <Suspended><LandingPage /></Suspended> : <Navigate to="/portal/dashboard" />
            } />
            <Route path="/login" element={
                !user ? <Suspended><LoginPage /></Suspended> : <Navigate to="/portal/dashboard" />
            } />
            
            <Route path="/portal" element={
                <ProtectedRoute>
                    <Suspended><DashboardPage /></Suspended>
                </ProtectedRoute>
            }>
                {/* --- Student Routes --- */}
                <Route path="dashboard" element={<Suspended><ComplaintList /></Suspended>} />
                <Route path="new-complaint" element={
                    <RoleRoute roles={['student']}><Suspended><ComplaintForm /></Suspended></RoleRoute>
                } />
                <Route path="marketplace" element={
                    <RoleRoute roles={['student', 'admin']}><Suspended><StudentMarketplace /></Suspended></RoleRoute>
                } />
                <Route path="lost-and-found" element={
                    <RoleRoute roles={['student', 'admin']}><Suspended><LostAndFoundPortal /></Suspended></RoleRoute>
                } />
                <Route path="mentors" element={
                    <RoleRoute roles={['student']}><Suspended><MentorPortal /></Suspended></RoleRoute>
                } />
                <Route path="leave" element={
                    <RoleRoute roles={['student']}><Suspended><HostelLeavePortal /></Suspended></RoleRoute>
                } />
                <Route path="faq" element={
                    <RoleRoute roles={['student']}><Suspended><FAQ /></Suspended></RoleRoute>
                } />
                <Route path="timetable" element={
                    <RoleRoute roles={['student']}><Suspended><StudentTimetable /></Suspended></RoleRoute>
                } />
                <Route path="news" element={
                    <RoleRoute roles={['student']}><Suspended><NewsPage /></Suspended></RoleRoute>
                } />

                {/* --- Mentor Routes --- */}
                <Route path="mentor-dashboard" element={
                    <RoleRoute roles={['mentor']}><Suspended><MentorDashboard /></Suspended></RoleRoute>
                } />

                {/* --- Admin & Department Routes --- */}
                <Route path="analytics" element={
                    <RoleRoute roles={['admin']}><Suspended><AnalyticsDashboard /></Suspended></RoleRoute>
                } />
                <Route path="users" element={
                    <RoleRoute roles={['admin']}><Suspended><UserManagement /></Suspended></RoleRoute>
                } />
                <Route path="mentor-approval" element={
                    <RoleRoute roles={['admin']}><Suspended><MentorApproval /></Suspended></RoleRoute>
                } />
                <Route path="knowledge-base" element={
                    <RoleRoute roles={['admin']}><Suspended><KnowledgeBaseManagement /></Suspended></RoleRoute>
                } />
                <Route path="leave-management" element={
                    <RoleRoute roles={['admin', 'department']}><Suspended><LeaveManagement /></Suspended></RoleRoute>
                } />
                <Route path="upload-timetable" element={
                    <RoleRoute roles={['admin']}><Suspended><TimetableUpload /></Suspended></RoleRoute>
                } />
                <Route path="emergency-log" element={
                    <RoleRoute roles={['admin', 'department']}><Suspended><EmergencyLog /></Suspended></RoleRoute>
                } />
                <Route path="student-chats" element={
                    <RoleRoute roles={['admin']}><Suspended><AdminChatPortal /></Suspended></RoleRoute>
                } />

                {/* --- Index/Fallback Route --- */}
                <Route index element={<Navigate to="/portal/dashboard" />} /> 
            </Route>

            <Route path="*" element={<Navigate to="/" />} />
        </Routes>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <GlobalErrorBoundary>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </GlobalErrorBoundary>
        </BrowserRouter>
    );
}