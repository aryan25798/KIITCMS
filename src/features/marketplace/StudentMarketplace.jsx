import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../services/firebase'; // Make sure this path is correct for your project structure
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare } from 'lucide-react';

// Assuming these components are in the specified paths
import Spinner from '../../components/ui/Spinner'; 
import { AddMarketplaceItemForm, MARKETPLACE_CATEGORIES } from './AddMarketplaceItemForm';
import MarketplaceItemCard from './MarketplaceItemCard';

const StudentMarketplace = () => {
    // Getting user context and chat handler from the parent route
    const { user, role, setActiveMarketplaceChat } = useOutletContext();

    // State management for the component
    const [activeTab, setActiveTab] = useState('browse'); // Controls which tab is visible
    const [items, setItems] = useState([]); // Stores all marketplace items
    const [sellerChats, setSellerChats] = useState([]); // Stores chats where the current user is the seller
    const [buyerChats, setBuyerChats] = useState([]); // Stores chats where the current user is the buyer
    const [loading, setLoading] = useState(true); // Manages loading state for data fetching
    const [searchTerm, setSearchTerm] = useState(''); // Stores the value of the search input
    const [categoryFilter, setCategoryFilter] = useState('All'); // Stores the selected category for filtering

    // Effect hook to subscribe to Firestore data
    useEffect(() => {
        // Query for all marketplace items, ordered by creation date
        const itemsQuery = query(collection(db, 'marketplaceItems'), orderBy('createdAt', 'desc'));
        const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
            const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setItems(itemsData);
            setLoading(false);
        });

        // Query for chats where the current user is the SELLER
        const sellerChatsQuery = query(collection(db, 'marketplaceChats'), where('sellerId', '==', user.uid));
        const unsubSeller = onSnapshot(sellerChatsQuery, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSellerChats(chatsData);
        });
        
        // Query for chats where the current user is the BUYER
        const buyerChatsQuery = query(collection(db, 'marketplaceChats'), where('buyerId', '==', user.uid));
        const unsubBuyer = onSnapshot(buyerChatsQuery, (snapshot) => {
            const chatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBuyerChats(chatsData);
        });

        // Cleanup function to unsubscribe from listeners when the component unmounts
        return () => {
            unsubscribeItems();
            unsubSeller();
            unsubBuyer();
        };
    }, [user.uid]); // Dependency array ensures this effect runs only when the user ID changes
    
    // useMemo to efficiently combine and sort chats whenever seller or buyer chats change
    const chats = useMemo(() => {
        const allChats = [...sellerChats, ...buyerChats];
        // Use a Map to easily remove duplicates based on chat ID
        const uniqueChats = Array.from(new Map(allChats.map(chat => [chat.id, chat])).values());
        // Sort chats by the last message timestamp to display the most recent ones first
        return uniqueChats.sort((a, b) => 
            (b.lastMessageTimestamp?.toDate() || 0) - (a.lastMessageTimestamp?.toDate() || 0)
        );
    }, [sellerChats, buyerChats]);

    // useMemo to filter items based on search term and category without re-running on every render
    const filteredItems = useMemo(() => {
        return items
            .filter(item => categoryFilter === 'All' || item.category === categoryFilter)
            .filter(item => 
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                item.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [items, categoryFilter, searchTerm]);

    // Callback function to switch back to the 'browse' tab after an item is added
    const onItemAdded = () => {
        setActiveTab('browse');
    };

    // Function to handle updating an item in Firestore
    const handleItemUpdate = async (itemId, updateData) => {
        const itemRef = doc(db, 'marketplaceItems', itemId);
        await updateDoc(itemRef, updateData);
    };
    
    // Function to handle deleting an item from Firestore
    const handleItemDelete = async (item) => {
        if (!window.confirm("Are you sure you want to permanently delete this listing? This action cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'marketplaceItems', item.id));
        } catch (error) {
            console.error("Error deleting item:", error);
            // In a real app, you might use a more user-friendly notification system
            alert("Failed to delete item. Please try again.");
        }
    };

    return (
        <div className="space-y-6 p-4 md:p-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Student Marketplace</h2>
                <p className="text-slate-400 mt-2">Buy and sell used items within the campus community.</p>
            </div>

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
                    {chats.length > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">{chats.length}</span>}
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
                    {/* Conditional rendering based on the active tab */}
                    {activeTab === 'add' ? (
                        <AddMarketplaceItemForm user={user} onItemAdded={onItemAdded} />
                    ) : activeTab === 'chats' ? (
                        <div className="max-w-4xl mx-auto">
                            <h3 className="text-2xl font-bold text-white mb-4">Your Conversations</h3>
                            {loading ? <div className="flex justify-center p-8"><Spinner size="h-10 w-10" color="border-cyan-400" /></div>
                            : chats.length > 0 ? (
                                <div className="space-y-4">
                                    {chats.map(chat => {
                                        const isSeller = chat.sellerId === user.uid;
                                        const otherUser = {
                                            uid: isSeller ? chat.buyerId : chat.sellerId,
                                            name: isSeller ? chat.buyerName : chat.sellerName,
                                            email: isSeller ? chat.buyerEmail : chat.sellerEmail,
                                        };
                                        // Find the corresponding item for the chat
                                        const item = items.find(i => i.id === chat.itemId);
                                        // If the item has been deleted, don't render the chat
                                        if (!item) return null;

                                        return (
                                            <motion.div 
                                                key={chat.id} 
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                                            >
                                                <div>
                                                    <p className="font-bold text-white">Chat about: {item.title}</p>
                                                    <p className="text-sm text-slate-400">
                                                        {isSeller ? `With Buyer: ${otherUser.name || 'N/A'}` : `With Seller: ${otherUser.name || 'N/A'}`}
                                                    </p>
                                                </div>
                                                <button 
                                                    onClick={() => setActiveMarketplaceChat({ item, chatWith: otherUser })}
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
                            {/* Display items or loading/empty state */}
                            {loading ? <div className="flex justify-center p-8"><Spinner size="h-10 w-10" color="border-cyan-400" /></div>
                            : filteredItems.length > 0 ? (
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
