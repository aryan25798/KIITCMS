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
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </BrowserRouter>
    );
}