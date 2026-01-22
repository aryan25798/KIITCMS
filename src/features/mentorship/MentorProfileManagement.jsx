import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Spinner from '../../components/ui/Spinner';
import { X } from 'lucide-react';

const MentorProfileManagement = ({ user, mentorData, onUpdate }) => {
    const [profile, setProfile] = useState(mentorData);
    const [newExpertise, setNewExpertise] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const mentorRef = doc(db, 'mentors', user.uid);
            await updateDoc(mentorRef, profile);
            onUpdate(profile);
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    const addExpertise = () => {
        if (newExpertise && !profile.expertise.includes(newExpertise)) {
            setProfile(p => ({ ...p, expertise: [...p.expertise, newExpertise] }));
            setNewExpertise('');
        }
    };

    const removeExpertise = (skillToRemove) => {
        setProfile(p => ({ ...p, expertise: p.expertise.filter(skill => skill !== skillToRemove) }));
    };

    return (
        <div className="bg-slate-800/50 p-6 rounded-xl border border-slate-700/50 space-y-6">
            <h3 className="text-xl font-bold text-white">Manage Your Profile</h3>
            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium text-slate-400">Full Name</label>
                    <input type="text" value={profile.name} onChange={e => setProfile({...profile, name: e.target.value})} className="w-full mt-1 p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white" />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-400">Bio</label>
                    <textarea value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} className="w-full mt-1 p-2 h-24 border border-slate-700 rounded-lg bg-slate-900/50 text-white" />
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-400">Areas of Expertise</label>
                    <div className="flex gap-2 mt-1">
                        <input type="text" value={newExpertise} onChange={e => setNewExpertise(e.target.value)} placeholder="e.g., Web Development" className="flex-grow p-2 border border-slate-700 rounded-lg bg-slate-900/50 text-white" />
                        <button onClick={addExpertise} className="px-4 py-2 bg-cyan-500 text-white font-semibold rounded-lg hover:bg-cyan-600">Add</button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {profile.expertise?.map(skill => (
                            <span key={skill} className="flex items-center gap-2 px-2 py-1 text-xs bg-green-500/10 text-green-300 rounded-full">
                                {skill}
                                <button onClick={() => removeExpertise(skill)}><X size={12} /></button>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
            <button onClick={handleSave} disabled={isSaving} className="w-full md:w-auto flex justify-center items-center px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50">
                {isSaving ? <Spinner /> : 'Save Profile'}
            </button>
        </div>
    );
};

export default MentorProfileManagement;