import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';
import { User, Mail, Clock, Trash2, Expand, X } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal'; // Import the new modal

// Modal component for displaying the map
const MapModal = ({ location, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl w-full max-w-4xl h-full max-h-[80vh] flex flex-col shadow-2xl border border-slate-700">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <h3 className="text-lg font-bold text-white">Location Preview</h3>
                    <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="flex-grow">
                    <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        src={`https://maps.google.com/maps?q=${location.latitude},${location.longitude}&hl=es;z=14&output=embed`}
                    >
                    </iframe>
                </div>
            </div>
        </div>
    );
};


const EmergencyLog = () => {
    const { role } = useAuth();
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [mapModalLocation, setMapModalLocation] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [alertToDelete, setAlertToDelete] = useState(null);

    useEffect(() => {
        // NOTE: Firestore queries should avoid orderBy to prevent potential index errors.
        // Data will be sorted client-side for simplicity.
        const q = query(collection(db, 'emergencies'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedAlerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort alerts by timestamp descending after fetching. Some alerts may
            // not have a timestamp yet (e.g. pending server timestamps), so we
            // defensively fall back to `0` to avoid runtime errors.
            fetchedAlerts.sort(
                (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)
            );
            setAlerts(fetchedAlerts);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const confirmDelete = (alertId) => {
      setAlertToDelete(alertId);
      setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
      if (!alertToDelete) return;
      setIsDeleteModalOpen(false); // Close the modal immediately
        try {
            const alertDocRef = doc(db, 'emergencies', alertToDelete);
            await deleteDoc(alertDocRef);
            setAlertToDelete(null); // Clear the alert to delete
        } catch (error) {
            console.error("Error deleting emergency log:", error);
            // In a real app, you might show another modal here for the error
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center p-8">
                <Spinner size="h-10 w-10" color="border-red-400" />
            </div>
        );
    }

    return (
        <>
            {mapModalLocation && <MapModal location={mapModalLocation} onClose={() => setMapModalLocation(null)} />}
            {isDeleteModalOpen && (
              <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Confirm Deletion"
                message="Are you sure you want to delete this emergency log? This action cannot be undone."
                confirmText="Delete"
                variant="danger"
              />
            )}
            <div className="bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-slate-800/50">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Emergency SOS Log</h2>
                {alerts.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
                        {alerts.map(alert => (
                            <div key={alert.id} className="bg-gradient-to-br from-slate-800/70 to-slate-900/50 border border-red-500/30 rounded-xl shadow-lg flex flex-col overflow-hidden">
                                <div className="p-5">
                                    <div className="flex items-center gap-3 mb-3">
                                        <User className="h-5 w-5 text-red-400 flex-shrink-0" />
                                        <p className="font-bold text-lg text-white truncate">{alert.userName || 'Unknown User'}</p>
                                    </div>
                                    <div className="flex items-center gap-3 mb-3 text-slate-300">
                                        <Mail className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                        <p className="text-sm truncate">{alert.userEmail || 'No Email Provided'}</p>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-300">
                                        <Clock className="h-5 w-5 text-slate-400 flex-shrink-0" />
                                        <p className="text-sm">
                                            {new Date(alert.timestamp?.seconds * 1000).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => setMapModalLocation(alert.location)}
                                    className="w-full h-40 relative group cursor-pointer"
                                >
                                    <iframe
                                        className="absolute inset-0 w-full h-full pointer-events-none"
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        src={`https://maps.google.com/maps?q=${alert.location.latitude},${alert.location.longitude}&hl=es;z=14&output=embed`}
                                    >
                                    </iframe>
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <Expand size={32} className="text-white" />
                                    </div>
                                </button>
                                
                                {role === 'admin' && (
                                    <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex items-center justify-end">
                                        <button 
                                            onClick={() => confirmDelete(alert.id)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white font-semibold text-xs rounded-md hover:bg-red-700 transition-colors"
                                        >
                                            <Trash2 size={14} /> Delete
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 px-6 bg-slate-800/50 rounded-lg">
                        <h3 className="text-xl font-semibold text-white">All Clear</h3>
                        <p className="text-slate-400 mt-2">No emergency alerts have been triggered.</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default EmergencyLog;
