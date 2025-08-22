import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';

// Feature Components for Routes
import VerifyEmail from './features/auth/VerifyEmail';
import PendingMentor from './features/auth/PendingMentor';
import ComplaintForm from './features/complaints/ComplaintForm';
import AnalyticsDashboard from './features/complaints/AnalyticsDashboard';
import ComplaintList from './features/complaints/ComplaintList';
import FAQ from './features/knowledgeBase/FAQ';
import UserManagement from './features/knowledgeBase/UserManagement';
import KnowledgeBaseManagement from './features/knowledgeBase/KnowledgeBaseManagement';
import StudentMarketplace from './features/marketplace/StudentMarketplace';
import MentorPortal from './features/mentorship/MentorPortal';
import MentorDashboard from './features/mentorship/MentorDashboard';
import MentorApproval from './features/mentorship/MentorApproval';
import LostAndFoundPortal from './features/lostAndFound/LostAndFoundPortal';
import HostelLeavePortal from './features/leave/HostelLeavePortal';
import LeaveManagement from './features/leave/LeaveManagement';
import TimetableUpload from './features/admin/TimetableUpload';
import StudentTimetable from './features/timetable/StudentTimetable';
import EmergencyLog from './features/admin/EmergencyLog';
import AdminChatPortal from './features/chat/AdminChatPortal';
import NewsPage from './features/news/NewsPage'; // Import the new NewsPage component

// Protects routes that require a logged-in user
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
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

    if (isAwaitingVerification) {
        return <VerifyEmail user={user} onResend={handleResendVerification} onBackToLogin={handleLogout} resendStatus={resendStatus} />;
    }

    if (role === 'pending_mentor') {
        return <PendingMentor onLogout={handleLogout} />;
    }
    
    return (
        <Routes>
            <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/portal/dashboard" />} />
            <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/portal/dashboard" />} />
            
            <Route path="/portal" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>}>
                {/* --- Student Routes --- */}
                <Route path="dashboard" element={<ComplaintList />} />
                <Route path="new-complaint" element={<RoleRoute roles={['student']}><ComplaintForm /></RoleRoute>} />
                <Route path="marketplace" element={<RoleRoute roles={['student', 'admin']}><StudentMarketplace /></RoleRoute>} />
                <Route path="lost-and-found" element={<RoleRoute roles={['student', 'admin']}><LostAndFoundPortal /></RoleRoute>} />
                <Route path="mentors" element={<RoleRoute roles={['student']}><MentorPortal /></RoleRoute>} />
                <Route path="leave" element={<RoleRoute roles={['student']}><HostelLeavePortal /></RoleRoute>} />
                <Route path="faq" element={<RoleRoute roles={['student']}><FAQ /></RoleRoute>} />
                <Route path="timetable" element={<RoleRoute roles={['student']}><StudentTimetable /></RoleRoute>} />
                {/* Add the new News page route */}
                <Route path="news" element={<RoleRoute roles={['student']}><NewsPage /></RoleRoute>} />

                {/* --- Mentor Routes --- */}
                <Route path="mentor-dashboard" element={<RoleRoute roles={['mentor']}><MentorDashboard /></RoleRoute>} />

                {/* --- Admin & Department Routes --- */}
                <Route path="analytics" element={<RoleRoute roles={['admin']}><AnalyticsDashboard /></RoleRoute>} />
                <Route path="users" element={<RoleRoute roles={['admin']}><UserManagement /></RoleRoute>} />
                <Route path="mentor-approval" element={<RoleRoute roles={['admin']}><MentorApproval /></RoleRoute>} />
                <Route path="knowledge-base" element={<RoleRoute roles={['admin']}><KnowledgeBaseManagement /></RoleRoute>} />
                <Route path="leave-management" element={<RoleRoute roles={['admin', 'department']}><LeaveManagement /></RoleRoute>} />
                <Route path="upload-timetable" element={<RoleRoute roles={['admin']}><TimetableUpload /></RoleRoute>} />
                <Route path="emergency-log" element={<RoleRoute roles={['admin', 'department']}><EmergencyLog /></RoleRoute>} />
                <Route path="student-chats" element={<RoleRoute roles={['admin']}><AdminChatPortal /></RoleRoute>} />

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
