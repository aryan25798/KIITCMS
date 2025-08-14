import React, { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MessageSquare } from 'lucide-react';
import Spinner from '../../components/ui/Spinner';
import { AddMarketplaceItemForm, MARKETPLACE_CATEGORIES } from './AddMarketplaceItemForm';
import MarketplaceItemCard from './MarketplaceItemCard';

const StudentMarketplace = () => {
    const { user, role, setActiveMarketplaceChat } = useOutletContext();

    const [activeTab, setActiveTab] = useState('browse');
    const [items, setItems] = useState([]);
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    useEffect(() => {
        const itemsQuery = query(collection(db, 'marketplaceItems'), orderBy('createdAt', 'desc'));
        const unsubscribeItems = onSnapshot(itemsQuery, (snapshot) => {
            setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        // Combined query for all chats involving the current user
        const sellerChatsQuery = query(collection(db, 'marketplaceChats'), where('sellerId', '==', user.uid));
        const buyerChatsQuery = query(collection(db, 'marketplaceChats'), where('buyerId', '==', user.uid));

        const unsubSeller = onSnapshot(sellerChatsQuery, (snapshot) => {
            const sellerChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChats(prev => {
                const otherChats = prev.filter(c => c.buyerId === user.uid);
                return [...otherChats, ...sellerChats];
            });
        });
        
        const unsubBuyer = onSnapshot(buyerChatsQuery, (snapshot) => {
            const buyerChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChats(prev => {
                const otherChats = prev.filter(c => c.sellerId === user.uid);
                return [...otherChats, ...buyerChats];
            });
        });

        return () => {
            unsubscribeItems();
            unsubSeller();
            unsubBuyer();
        };
    }, [user.uid]);

    const filteredItems = useMemo(() => {
        return items
            .filter(item => categoryFilter === 'All' || item.category === categoryFilter)
            .filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [items, categoryFilter, searchTerm]);

    const onItemAdded = () => {
        setActiveTab('browse');
    };

    const handleItemUpdate = async (itemId, updateData) => {
        const itemRef = doc(db, 'marketplaceItems', itemId);
        await updateDoc(itemRef, updateData);
    };

    // UPDATED delete logic: only delete Firestore doc, DO NOT delete storage image
    const handleItemDelete = async (item) => {
        if (!window.confirm("Are you sure you want to permanently delete this listing?")) return;
        try {
            await deleteDoc(doc(db, 'marketplaceItems', item.id));
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Failed to delete item.");
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center">
                <h2 className="text-3xl font-bold text-white">Student Marketplace</h2>
                <p className="text-slate-400 mt-2">Buy and sell used items within the campus community.</p>
            </div>

            <div className="flex justify-center border border-slate-700 rounded-lg p-1 max-w-md mx-auto">
                <button onClick={() => setActiveTab('browse')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'browse' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    Browse Items
                </button>
                <button onClick={() => setActiveTab('add')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors ${activeTab === 'add' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    Sell an Item
                </button>
                <button onClick={() => setActiveTab('chats')} className={`flex-1 py-2 text-sm font-semibold rounded-md transition-colors relative ${activeTab === 'chats' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>
                    My Chats
                    {chats.length > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">{chats.length}</span>}
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
                    {chats.length > 0 ? (
                        <div className="space-y-4">
                            {chats.map(chat => {
                                const isSeller = chat.sellerId === user.uid;
                                const otherUser = {
                                    uid: isSeller ? chat.buyerId : chat.sellerId,
                                    name: isSeller ? chat.buyerName : chat.sellerName,
                                    email: isSeller ? chat.buyerEmail : chat.sellerEmail,
                                };
                                const item = items.find(i => i.id === chat.itemId);
                                if (!item) return null; // Don't render chat if item was deleted

                                return (
                                    <div key={chat.id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-white">Chat about: {item.title}</p>
                                            <p className="text-sm text-slate-400">
                                                {isSeller ? `Buyer: ${otherUser.name}` : `Seller: ${otherUser.name}`}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => setActiveMarketplaceChat({ item, chatWith: otherUser })}
                                            className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700"
                                        >
                                            <MessageSquare size={18}/> Open Chat
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-center text-slate-400 py-12">No one has contacted you about your items yet.</p>
                    )}
                </div>
            ) : (
                <div>
                    <div className="flex flex-col md:flex-row gap-4 mb-4">
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
                    {loading ? <div className="flex justify-center p-8"><Spinner size="h-10 w-10" color="border-cyan-400" /></div>
                    : filteredItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredItems.map(item => (
                                <MarketplaceItemCard key={item.id} item={item} user={user} role={role} onUpdate={handleItemUpdate} onDelete={handleItemDelete} onChat={setActiveMarketplaceChat} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-slate-400">
                            <p>No items match your search. Try changing the filters or check back later!</p>
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
