import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Inbox } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import ReportLostItemForm from './ReportLostItemForm';
import LostItemCard from './LostItemCard';

const itemCategories = ['Electronics', 'Books', 'Clothing', 'ID Cards', 'Keys', 'Other'];

const LostAndFoundPortal = () => {
    const { user, role, setActiveLostAndFoundChat } = useOutletContext();
    const [activeTab, setActiveTab] = useState('view');
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        const q = query(collection(db, 'lostAndFoundItems'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const filteredItems = useMemo(() => {
        return items
            .filter(item => categoryFilter === 'All' || item.category === categoryFilter)
            .filter(item =>
                item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [items, categoryFilter, searchTerm]);

    const handleItemReported = () => {
        setActiveTab('view');
    };

    const handleItemUpdate = async (itemId, updateData) => {
        const itemRef = doc(db, 'lostAndFoundItems', itemId);
        try {
            await updateDoc(itemRef, updateData);
        } catch (error) {
            console.error("Error updating item:", error);
            alert("Failed to update item.");
        }
    };

    const handleItemDelete = async (item) => {
        if (!window.confirm("Are you sure you want to delete this item permanently?")) return;

        try {
            // Removed Firebase Storage deletion because images are on Cloudinary

            // Delete Firestore document
            await deleteDoc(doc(db, 'lostAndFoundItems', item.id));
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Failed to delete item.");
        }
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <header className="text-center mb-8">
                <h2 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">Lost & Found Portal</h2>
                <p className="mt-2 text-lg text-cyan-300/80 max-w-xl mx-auto">
                    Report items you've lost or browse to see if someone has found them.
                </p>
            </header>

            {role === 'student' && (
                <nav className="flex justify-center max-w-md mx-auto bg-slate-800/40 backdrop-blur-md rounded-full border border-cyan-600 shadow-lg shadow-cyan-900/40">
                    <motion.button
                        onClick={() => setActiveTab('view')}
                        className={`flex-1 py-3 text-sm font-semibold rounded-full transition-colors select-none
                            ${activeTab === 'view' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/60' : 'text-cyan-400 hover:bg-cyan-600/30 hover:text-white'}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-current={activeTab === 'view' ? 'page' : undefined}
                    >
                        View Items
                    </motion.button>
                    <motion.button
                        onClick={() => setActiveTab('report')}
                        className={`flex-1 py-3 text-sm font-semibold rounded-full transition-colors select-none
                            ${activeTab === 'report' ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/60' : 'text-cyan-400 hover:bg-cyan-600/30 hover:text-white'}`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        aria-current={activeTab === 'report' ? 'page' : undefined}
                    >
                        Report an Item
                    </motion.button>
                </nav>
            )}

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.4, ease: 'easeInOut' }}
                >
                    {activeTab === 'report' && role === 'student' && (
                        <ReportLostItemForm
                            user={user}
                            categories={itemCategories}
                            onItemReported={handleItemReported}
                            className="bg-slate-900/60 p-6 rounded-xl shadow-lg border border-cyan-700"
                        />
                    )}

                    {(activeTab === 'view' || role !== 'student') && (
                        <section>
                            <div className="flex flex-col md:flex-row gap-5 mb-6 max-w-4xl mx-auto">
                                <div className="relative flex-grow">
                                    <Search
                                        className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-400/70"
                                        size={22}
                                        aria-hidden="true"
                                    />
                                    <input
                                        type="text"
                                        placeholder="Search for items..."
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full rounded-xl bg-slate-900/50 border border-cyan-600 text-white placeholder-cyan-400/70 py-3 pl-12 pr-4
                                        focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow shadow-md shadow-cyan-900/50"
                                        aria-label="Search lost and found items"
                                    />
                                </div>
                                <select
                                    value={categoryFilter}
                                    onChange={e => setCategoryFilter(e.target.value)}
                                    className="rounded-xl bg-slate-900/50 border border-cyan-600 text-white py-3 px-4
                                    focus:outline-none focus:ring-2 focus:ring-cyan-500 shadow-md shadow-cyan-900/50"
                                    aria-label="Filter items by category"
                                >
                                    <option>All</option>
                                    {itemCategories.map(cat => (
                                        <option key={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Spinner size="h-12 w-12" color="border-cyan-500" />
                                </div>
                            ) : filteredItems.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-2">
                                    {filteredItems.map(item => (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.3 }}
                                            whileHover={{ scale: 1.03, boxShadow: '0 15px 25px rgba(6,182,212,0.4)' }}
                                            className="rounded-xl bg-slate-800/80 border border-cyan-600 shadow-lg"
                                        >
                                            <LostItemCard
                                                item={item}
                                                user={user}
                                                role={role}
                                                onUpdate={handleItemUpdate}
                                                onDelete={() => handleItemDelete(item)}
                                                onChat={setActiveLostAndFoundChat}
                                            />
                                        </motion.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 text-cyan-500/70 space-y-3">
                                    <Inbox size={48} />
                                    <p className="text-xl font-semibold">No lost items match your search.</p>
                                    <p className="max-w-md text-center text-cyan-400/80">Try a different filter or check back later.</p>
                                </div>
                            )}
                        </section>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default LostAndFoundPortal;
