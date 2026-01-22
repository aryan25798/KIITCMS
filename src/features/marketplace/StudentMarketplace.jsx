import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare, AlertCircle } from 'lucide-react';

import Spinner from '../../components/ui/Spinner'; 
import { AddMarketplaceItemForm, MARKETPLACE_CATEGORIES } from './AddMarketplaceItemForm';
import MarketplaceItemCard from './MarketplaceItemCard';

const StudentMarketplace = () => {
    const { user, role, setActiveMarketplaceChat } = useOutletContext();

    // UI State
    const [activeTab, setActiveTab] = useState('browse');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [error, setError] = useState(null);

    // Data State
    const [items, setItems] = useState([]);
    // We now use a single list for chats, as the query fetches all relevant ones
    const [myChats, setMyChats] = useState([]); 

    // Loading States
    const [itemsLoading, setItemsLoading] = useState(true);
    const [chatsLoading, setChatsLoading] = useState(true);

    // Subscribe to Firestore Data
    useEffect(() => {
        setItemsLoading(true);
        setChatsLoading(true);
        setError(null);

        // --- 1. Fetch Marketplace Items ---
        const itemsQuery = query(collection(db, 'marketplaceItems'), orderBy('createdAt', 'desc'));
        const unsubscribeItems = onSnapshot(itemsQuery, 
            (snapshot) => {
                const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setItems(itemsData);
                setItemsLoading(false);
            },
            (err) => {
                console.error("Error fetching items:", err);
                setError("Failed to load marketplace items. Please check your connection.");
                setItemsLoading(false);
            }
        );

        // --- 2. Fetch User Chats (FIXED) ---
        // Instead of splitting Buyer vs Seller queries (which causes permission errors),
        // we query the 'participants' array. This matches the new Security Rules.
        if (user?.uid) {
            const chatsQuery = query(
                collection(db, 'marketplaceChats'), 
                where('participants', 'array-contains', user.uid)
            );

            const unsubscribeChats = onSnapshot(chatsQuery, 
                (snapshot) => {
                    const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    
                    // Sort locally by last message time (descending)
                    chatsData.sort((a, b) => 
                        (b.lastMessageTimestamp?.toDate() || 0) - (a.lastMessageTimestamp?.toDate() || 0)
                    );
                    
                    setMyChats(chatsData);
                    setChatsLoading(false);
                },
                (err) => {
                    console.error("Error fetching chats:", err);
                    // We don't set a global error here to allow the Item Browser to still work
                    setChatsLoading(false);
                }
            );

            return () => {
                unsubscribeItems();
                unsubscribeChats();
            };
        } else {
            // Should not happen if guarded by AuthContext, but safe fallback
            return () => {
                unsubscribeItems();
            };
        }
    }, [user.uid]);
    
    // Client-side filtering (Efficient for <1000 items)
    const filteredItems = useMemo(() => {
        return items
            .filter(item => categoryFilter === 'All' || item.category === categoryFilter)
            .filter(item => 
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [items, categoryFilter, searchTerm]);

    const onItemAdded = () => {
        setActiveTab('browse');
    };

    const handleItemUpdate = async (itemId, updateData) => {
        try {
            const itemRef = doc(db, 'marketplaceItems', itemId);
            await updateDoc(itemRef, updateData);
        } catch (err) {
            console.error("Update failed:", err);
            alert("Failed to update item.");
        }
    };
    
    const handleItemDelete = async (item) => {
        if (!window.confirm("Are you sure you want to permanently delete this listing? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'marketplaceItems', item.id));
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Failed to delete item. Please try again.");
        }
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Student Marketplace</h2>
                <p className="text-slate-400 mt-2">Buy and sell used items within the campus community.</p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-lg flex items-center gap-3 text-red-200 max-w-2xl mx-auto">
                    <AlertCircle size={24} />
                    <p>{error}</p>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex justify-center border border-slate-700 rounded-lg p-1 max-w-md mx-auto bg-slate-800/50">
                <button onClick={() => setActiveTab('browse')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'browse' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    Browse Items
                </button>
                <button onClick={() => setActiveTab('add')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'add' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    Sell an Item
                </button>
                <button onClick={() => setActiveTab('chats')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors relative ${activeTab === 'chats' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    My Chats
                    {myChats.length > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">{myChats.length}</span>}
                </button>
            </div>
            
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeTab === 'add' ? (
                        <AddMarketplaceItemForm user={user} onItemAdded={onItemAdded} />
                    ) : activeTab === 'chats' ? (
                        <div className="max-w-4xl mx-auto">
                            <h3 className="text-2xl font-bold text-white mb-4">Your Conversations</h3>
                            
                            {/* Chats List */}
                            {chatsLoading ? (
                                <div className="flex justify-center p-8"><Spinner size="h-10 w-10" color="border-cyan-400" /></div>
                            ) : myChats.length > 0 ? (
                                <div className="space-y-4">
                                    {myChats.map(chat => {
                                        // Determine role logic locally
                                        const isSeller = chat.sellerId === user.uid;
                                        
                                        // Construct the "Other User" object for the UI
                                        const otherUser = {
                                            uid: isSeller ? chat.buyerId : chat.sellerId,
                                            name: isSeller ? chat.buyerName : chat.sellerName,
                                            email: isSeller ? chat.buyerEmail : chat.sellerEmail,
                                        };
                                        
                                        // Try to find live item data from our items list
                                        // If the item was deleted, fallback to the snapshot data saved in the chat
                                        const item = items.find(i => i.id === chat.itemId) || { title: chat.itemName || "Unknown Item (Deleted)" };
                                        
                                        return (
                                            <motion.div 
                                                key={chat.id} 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-cyan-500/30 transition-colors"
                                            >
                                                <div>
                                                    <p className="font-bold text-white flex items-center gap-2">
                                                        {item.title}
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${isSeller ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                            {isSeller ? 'Selling' : 'Buying'}
                                                        </span>
                                                    </p>
                                                    <p className="text-sm text-slate-400">
                                                        Chatting with: <span className="text-slate-200">{otherUser.name || 'User'}</span>
                                                    </p>
                                                    {chat.lastMessage && (
                                                        <p className="text-xs text-slate-500 mt-1 italic truncate max-w-xs">"{chat.lastMessage}"</p>
                                                    )}
                                                </div>
                                                <button 
                                                    // Pass the combined data to the chat modal context
                                                    onClick={() => setActiveMarketplaceChat({ 
                                                        item: { ...item, id: chat.itemId }, // Ensure ID is passed
                                                        chatWith: otherUser, 
                                                        chatId: chat.id 
                                                    })}
                                                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors w-full sm:w-auto justify-center"
                                                >
                                                    <MessageSquare size={18}/> Open Chat
                                                </button>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <p className="text-center text-slate-400 py-12">You have no active chats.</p>
                            )}
                        </div>
                    ) : (
                        <div>
                            {/* Search and Filter UI */}
                            <div className="flex flex-col md:flex-row gap-4 mb-6">
                                <div className="relative flex-grow">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={20}/>
                                    <input type="text" placeholder="Search for items..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full p-3 pl-11 border border-slate-700 rounded-lg bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
                                </div>
                                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="p-3 border border-slate-700 rounded-lg bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500">
                                    <option>All</option>
                                    {MARKETPLACE_CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                                </select>
                            </div>

                            {/* Items List */}
                            {itemsLoading ? (
                                <div className="flex justify-center p-8"><Spinner size="h-10 w-10" color="border-cyan-400" /></div>
                            ) : filteredItems.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {filteredItems.map(item => (
                                        <MarketplaceItemCard key={item.id} item={item} user={user} role={role} onUpdate={handleItemUpdate} onDelete={handleItemDelete} onChat={setActiveMarketplaceChat} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <p className="text-lg">No items found.</p>
                                    <p>Try adjusting your search or filters, or check back later!</p>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default StudentMarketplace;