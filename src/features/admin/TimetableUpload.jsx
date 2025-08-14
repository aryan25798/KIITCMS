import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { cloudinaryConfig, timetableConfig } from '../../config';
import Spinner from '../../components/ui/Spinner';
import { UploadCloud, AlertTriangle } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

const TimetableUpload = () => {
    const { user } = useOutletContext();
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const isSuperAdmin = user?.email === 'admin@system.com';

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError('');
            setSuccess('');
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a file first.");
            return;
        }
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', file);
            formData.append('upload_preset', cloudinaryConfig.timetableUploadPreset);

            const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/raw/upload`;
            const response = await fetch(cloudinaryUrl, { method: 'POST', body: formData });

            if (!response.ok) throw new Error('Cloudinary upload failed.');

            const data = await response.json();
            const fileUrl = data.secure_url;

            // Save URL to Firestore
            await setDoc(doc(db, timetableConfig.collection, timetableConfig.document), {
                fileUrl,
                lastUpdated: new Date().toISOString(),
                updatedBy: user.email,
            });

            setSuccess("Master timetable has been successfully uploaded.");
            setFile(null);
        } catch (err) {
            console.error("Error uploading timetable:", err);
            setError("An error occurred during upload.");
        } finally {
            setLoading(false);
        }
    };

    if (!isSuperAdmin) {
        return (
            <div className="text-center text-red-400 py-12">
                You do not have permission to upload timetables.
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-white mb-4">Upload Master Timetable</h2>
            <p className="text-slate-400 mb-6">
                Upload the complete Excel (.xlsx) file for all sections. This will replace the current live timetable for all students.
            </p>

            <div className="flex items-center gap-4">
                <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                />
                <label
                    htmlFor="file-upload"
                    className="flex-grow cursor-pointer p-4 text-center border-2 border-dashed border-slate-600 rounded-lg hover:border-cyan-400 hover:bg-slate-800 transition-colors"
                >
                    {file ? `Selected: ${file.name}` : "Click to select the Master Excel file"}
                </label>
            </div>

            {file && (
                <div className="mt-6">
                    <button
                        onClick={handleUpload}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600 disabled:opacity-60"
                    >
                        {loading ? <Spinner /> : <UploadCloud size={20} />}
                        {loading ? 'Uploading...' : 'Upload and Publish Timetable'}
                    </button>
                </div>
            )}

            {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg flex items-center gap-3">
                    <AlertTriangle size={20} />
                    <span>{error}</span>
                </div>
            )}
            {success && (
                <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 text-green-300 rounded-lg">
                    {success}
                </div>
            )}
        </div>
    );
};

export default TimetableUpload;
