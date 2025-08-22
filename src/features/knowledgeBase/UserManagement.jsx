import React, { useState } from 'react';

const UserManagement = () => {
    // This is a placeholder. In a real app, you would fetch users from 
    // Firebase Authentication, which requires a backend Cloud Function for security reasons.
    const [users] = useState([
        { id: '1', email: 'it@system.com', role: 'department' },
        { id: '2', email: 'maintenance@system.com', role: 'department' },
        { id: '3', email: 'hostel@system.com', role: 'department' },
        { id: '4', email: 'academics@system.com', role: 'department' },
        { id: '5', email: 'some.student@email.com', role: 'student' },
    ]);

    return (
        <div className="bg-slate-800/50 backdrop-blur-xl p-6 rounded-xl shadow-lg border border-slate-700/50">
            <h2 className="text-2xl font-bold mb-4 text-white">User Management</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Email</th>
                            <th scope="col" className="px-6 py-3">Role</th>
                            <th scope="col" className="px-6 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-slate-700">
                                <td className="px-6 py-4 font-medium text-white">{user.email}</td>
                                <td className="px-6 py-4">{user.role}</td>
                                <td className="px-6 py-4">
                                    <button className="text-red-400 hover:text-red-300">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UserManagement;