import React, { useState, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../../components/ui/StatCard';
import Spinner from '../../components/ui/Spinner';
import { ListTodo, Clock, ChevronsUp, Download } from 'lucide-react';

const AnalyticsDashboard = () => {
    const { complaints, complaintsLoading } = useOutletContext();
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const analyticsRef = useRef(null);

    const filteredComplaints = useMemo(() => {
        if (!complaints) return [];
        if (!dateRange.start || !dateRange.end) return complaints;
        const startDate = new Date(dateRange.start).getTime();
        const endDate = new Date(dateRange.end).getTime() + (24 * 60 * 60 * 1000 - 1); // Include the whole end day
        return complaints.filter(c => {
            const complaintDate = c.createdAt?.seconds * 1000;
            return complaintDate >= startDate && complaintDate <= endDate;
        });
    }, [complaints, dateRange]);

    const departmentData = useMemo(() => {
        const counts = filteredComplaints.reduce((acc, c) => {
            const dept = c.assignedDept || 'Unassigned';
            acc[dept] = (acc[dept] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([name, value]) => ({ name, complaints: value }));
    }, [filteredComplaints]);

    const statusData = useMemo(() => {
        const counts = filteredComplaints.reduce((acc, c) => {
            const status = c.status || 'Unknown';
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [filteredComplaints]);

    const averageResolutionTime = useMemo(() => {
        const resolved = filteredComplaints.filter(c => c.status === 'Resolved' && c.createdAt?.seconds && c.resolvedAt?.seconds);
        if (resolved.length === 0) return 'N/A';
        const totalDuration = resolved.reduce((acc, c) => acc + (c.resolvedAt.seconds - c.createdAt.seconds), 0);
        const avgSeconds = totalDuration / resolved.length;
        const avgDays = avgSeconds / (24 * 60 * 60);
        return `${avgDays.toFixed(1)} days`;
    }, [filteredComplaints]);
    
    const exportToPDF = () => {
        if (window.jspdf && window.html2canvas) {
            const { jsPDF } = window.jspdf;
            const input = analyticsRef.current;
            window.html2canvas(input, { scale: 2, backgroundColor: '#020617' }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const ratio = canvasWidth / canvasHeight;
                let width = pdfWidth - 20;
                let height = width / ratio;
                if (height > pdfHeight - 20) {
                    height = pdfHeight - 20;
                    width = height * ratio;
                }
                pdf.addImage(imgData, 'PNG', 10, 10, width, height);
                pdf.save(`analytics-report.pdf`);
            });
        } else {
            console.error("PDF generation libraries not loaded yet.");
            alert("PDF generation library is not available. Please wait a moment and try again.");
        }
    };

    const COLORS = ['#06b6d4', '#8b5cf6', '#10b981', '#f97316', '#f59e0b'];

    if (complaintsLoading) {
        return <div className="flex justify-center items-center h-64"><Spinner size="h-12 w-12" color="border-cyan-400" /></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white"/>
                    <span className="text-slate-400">to</span>
                    <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white"/>
                </div>
                <button onClick={exportToPDF} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600">
                    <Download size={18} /> Export as PDF
                </button>
            </div>
            <div ref={analyticsRef} className="p-4 bg-slate-900 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="Total Complaints" value={filteredComplaints.length} icon={<ListTodo className="text-blue-400"/>} colorClass="bg-blue-500" />
                    <StatCard title="Avg. Resolution Time" value={averageResolutionTime} icon={<Clock className="text-yellow-400"/>} colorClass="bg-yellow-500" />
                    <StatCard title="Escalated Tickets" value={filteredComplaints.filter(c => c.isEscalated).length} icon={<ChevronsUp className="text-red-400"/>} colorClass="bg-red-500" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-8">
                    <div className="lg:col-span-3 bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700/50">
                        <h3 className="text-lg font-bold text-white mb-4">Complaints by Department</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={departmentData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}/>
                                <Legend />
                                <Bar dataKey="complaints" fill="#06b6d4" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="lg:col-span-2 bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700/50">
                       <h3 className="text-lg font-bold text-white mb-4">Status Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', color: '#e2e8f0' }}/>
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;