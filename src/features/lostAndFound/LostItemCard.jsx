import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { serverTimestamp } from 'firebase/firestore';
import StatusPill from '../../components/ui/StatusPill';
import { MessageSquare, Trash2, X } from 'lucide-react';
import { createNotification } from '../../services/notifications';

const LostItemCard = ({ item, user, role, onUpdate, onDelete, onChat }) => {
    const [isImageOpen, setIsImageOpen] = useState(false);
    const isOwner = item.ownerId === user.uid;
    const isAdmin = role === 'admin';
    const isFinder = item.finderId === user.uid;

    const handleFoundIt = async () => {
        if (!window.confirm("Are you sure you found this item? This will notify the owner and open a chat.")) return;
        const updateData = {
            status: 'Found',
            finderId: user.uid,
            finderName: user.displayName,
            foundAt: serverTimestamp()
        };
        await onUpdate(item.id, updateData);
        
        await createNotification({
            recipientId: item.ownerId,
            message: `Good news! Your lost item '${item.itemName}' has been found by ${user.displayName}.`,
            type: 'lost_item_found',
            itemId: item.id
        });

        onChat({ 
            item: { ...item, ...updateData }, 
            chatWith: { uid: item.ownerId, name: item.ownerName } 
        });
    };

    const handleClaimed = async () => {
        await onUpdate(item.id, { status: 'Claimed', claimedAt: serverTimestamp() });
        if (item.finderId) {
            await createNotification({
                recipientId: item.finderId,
                message: `The item you found, '${item.itemName}', has been claimed by the owner. Thank you!`,
                type: 'lost_item_claimed',
                itemId: item.id
            });
        }
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 p-5 rounded-xl border border-slate-700/50 flex flex-col"
            >
                <div className="relative w-full h-48 mb-4">
                    <img 
                        src={item.imageUrl || `https://placehold.co/600x400/0f172a/94a3b8?text=No+Image`} 
                        alt={item.itemName} 
                        className="w-full h-full object-cover rounded-lg cursor-pointer"
                        onClick={() => item.imageUrl && setIsImageOpen(true)}
                    />
                </div>
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-white">{item.itemName}</h3>
                    <StatusPill status={item.status} />
                </div>
                <p className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded-full self-start mb-3">{item.category}</p>
                <p className="text-sm text-slate-300 flex-grow"><strong className="text-slate-400">Description:</strong> {item.description}</p>
                <p className="text-sm text-slate-300 mt-2"><strong className="text-slate-400">Last Seen:</strong> {item.lastSeenLocation}</p>
                <p className="text-xs text-slate-500 mt-3">
                    Lost by {item.ownerName} on {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleDateString() : '...'}
                </p>

                {item.status === 'Found' && (
                    <div className="mt-3 p-3 bg-blue-500/10 rounded-lg text-sm">
                        <p className="text-blue-300">Found by: <strong className="text-white">{item.finderName}</strong></p>
                        {isOwner && <p className="text-blue-300">Please coordinate to retrieve your item.</p>}
                    </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-slate-700/50 flex flex-col gap-2">
                    {role === 'student' && !isOwner && item.status === 'Lost' && (
                        <button onClick={handleFoundIt} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">I Found This!</button>
                    )}
                    {role === 'student' && isOwner && item.status === 'Found' && (
                        <>
                            <button onClick={() => onChat({ item, chatWith: { uid: item.finderId, name: item.finderName } })} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700">
                                <MessageSquare size={18}/> Chat with Finder
                            </button>
                            <button onClick={handleClaimed} className="w-full px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700">Mark as Claimed</button>
                        </>
                    )}
                    {role === 'student' && isFinder && item.status === 'Found' && (
                        <button onClick={() => onChat({ item, chatWith: { uid: item.ownerId, name: item.ownerName } })} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700">
                            <MessageSquare size={18}/> Chat with Owner
                        </button>
                    )}

                    {(isAdmin || (role === 'student' && isOwner)) && (
                        <div className="flex justify-end items-center">
                            <button onClick={() => onDelete(item)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full"><Trash2 size={16} /></button>
                        </div>
                    )}
                </div>
            </motion.div>

            <AnimatePresence>
                {isImageOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsImageOpen(false)}
                        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
                    >
                        <motion.img
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0.5 }}
                            src={item.imageUrl}
                            alt={item.itemName}
                            className="max-w-full max-h-full rounded-lg"
                            onClick={(e) => e.stopPropagation()} // Prevents modal from closing when clicking the image
                        />
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsImageOpen(false)}
                            className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2"
                        >
                            <X size={24} />
                        </motion.button>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default LostItemCard;
