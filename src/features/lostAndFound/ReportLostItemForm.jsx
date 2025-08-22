import React, { useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { cloudinaryConfig } from '../../config';
import Spinner from '../../components/ui/Spinner';
import { Paperclip } from 'lucide-react';
import { motion } from 'framer-motion';

const ReportLostItemForm = ({ categories, onItemReported }) => {
    const { user } = useOutletContext();
    const [itemName, setItemName] = useState('');
    const [category, setCategory] = useState(categories[0]);
    const [description, setDescription] = useState('');
    const [lastSeenLocation, setLastSeenLocation] = useState('');
    const [image, setImage] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!itemName || !description || !lastSeenLocation) {
            setError('Please fill out all required fields.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        let imageUrl = '';

        try {
            if (image) {
                const formData = new FormData();
                formData.append('file', image);
                formData.append('upload_preset', cloudinaryConfig.uploadPreset);

                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
                    {
                        method: 'POST',
                        body: formData,
                    }
                );

                if (!response.ok) {
                    throw new Error('Image upload failed.');
                }

                const data = await response.json();
                imageUrl = data.secure_url;
            }

            await addDoc(collection(db, 'lostAndFoundItems'), {
                itemName,
                category,
                description,
                lastSeenLocation,
                imageUrl,
                status: 'Lost',
                ownerId: user.uid,
                ownerName: user.displayName,
                ownerEmail: user.email,
                finderId: null,
                finderName: null,
                createdAt: serverTimestamp(),
            });
            onItemReported();
        } catch (err) {
            console.error("Error reporting lost item:", err);
            setError('Failed to report item. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto p-8 rounded-3xl
                bg-[rgba(255,255,255,0.1)]
                border border-[rgba(255,255,255,0.15)]
                backdrop-blur-lg
                shadow-lg
                text-white
                relative
                overflow-hidden"
        >
            {/* Soft glassmorphism blobs */}
            <div
                aria-hidden="true"
                className="absolute -top-20 -left-20 w-[300px] h-[300px] rounded-full
                    bg-gradient-to-tr from-[rgba(180,200,255,0.3)] via-[rgba(130,160,210,0.2)] to-[rgba(100,120,180,0.25)]
                    opacity-30 blur-3xl animate-blob
                    mix-blend-screen"
            />
            <div
                aria-hidden="true"
                className="absolute bottom-0 right-0 w-[220px] h-[220px] rounded-full
                    bg-gradient-to-br from-[rgba(210,180,230,0.3)] via-[rgba(180,160,210,0.2)] to-[rgba(150,140,190,0.25)]
                    opacity-25 blur-2xl animate-blob animation-delay-2000
                    mix-blend-screen"
            />

            <h3 className="text-3xl font-extrabold tracking-wide mb-6 text-[rgba(180,220,255,0.85)] drop-shadow-lg">
                Report a Lost Item
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                {error && (
                    <p className="text-red-400 bg-red-900/30 p-3 rounded-lg border border-red-600 drop-shadow-md font-semibold">
                        {error}
                    </p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label
                            htmlFor="itemName"
                            className="block text-sm font-semibold text-[rgba(180,220,255,0.75)] mb-1 tracking-wide"
                        >
                            Item Name
                        </label>
                        <input
                            id="itemName"
                            value={itemName}
                            onChange={e => setItemName(e.target.value)}
                            className="w-full mt-1 p-3 rounded-xl
                                bg-[rgba(20,30,50,0.7)]
                                border border-[rgba(180,220,255,0.6)]
                                text-white
                                placeholder-[rgba(180,220,255,0.6)]
                                focus:outline-none focus:ring-2 focus:ring-[rgba(180,220,255,0.8)]
                                transition duration-300"
                            required
                            placeholder="Enter item name"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="category"
                            className="block text-sm font-semibold text-[rgba(180,220,255,0.75)] mb-1 tracking-wide"
                        >
                            Category
                        </label>
                        <select
                            id="category"
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            className="w-full mt-1 p-3 rounded-xl
                                bg-[rgba(20,30,50,0.7)]
                                border border-[rgba(180,220,255,0.6)]
                                text-white
                                focus:outline-none focus:ring-2 focus:ring-[rgba(180,220,255,0.8)]
                                transition duration-300"
                        >
                            {categories.map(c => (
                                <option key={c} className="bg-[rgba(20,30,50,0.7)]">
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label
                        htmlFor="lastSeenLocation"
                        className="block text-sm font-semibold text-[rgba(180,220,255,0.75)] mb-1 tracking-wide"
                    >
                        Last Seen Location
                    </label>
                    <input
                        id="lastSeenLocation"
                        value={lastSeenLocation}
                        onChange={e => setLastSeenLocation(e.target.value)}
                        placeholder="e.g., Library, 2nd Floor"
                        className="w-full mt-1 p-3 rounded-xl
                            bg-[rgba(20,30,50,0.7)]
                            border border-[rgba(180,220,255,0.6)]
                            text-white
                            placeholder-[rgba(180,220,255,0.6)]
                            focus:outline-none focus:ring-2 focus:ring-[rgba(180,220,255,0.8)]
                            transition duration-300"
                        required
                    />
                </div>
                <div>
                    <label
                        htmlFor="description"
                        className="block text-sm font-semibold text-[rgba(180,220,255,0.75)] mb-1 tracking-wide"
                    >
                        Description
                    </label>
                    <textarea
                        id="description"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full mt-1 p-3 h-28 rounded-xl
                            bg-[rgba(20,30,50,0.7)]
                            border border-[rgba(180,220,255,0.6)]
                            text-white
                            placeholder-[rgba(180,220,255,0.6)]
                            focus:outline-none focus:ring-2 focus:ring-[rgba(180,220,255,0.8)]
                            resize-none
                            transition duration-300"
                        required
                        placeholder="Describe your lost item..."
                    />
                </div>
                <div>
                    <label
                        htmlFor="image"
                        className="block text-sm font-semibold text-[rgba(180,220,255,0.75)] mb-1 tracking-wide"
                    >
                        Image (Optional)
                    </label>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={e => setImage(e.target.files[0])}
                        className="hidden"
                        accept="image/*"
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="w-full mt-1 flex items-center justify-center gap-3 px-5 py-3
                            bg-gradient-to-r from-[rgba(180,220,255,0.4)] to-[rgba(130,160,210,0.4)]
                            rounded-xl
                            text-white font-semibold
                            shadow-md
                            hover:brightness-105
                            transition duration-300
                            focus:outline-none focus:ring-4 focus:ring-[rgba(180,220,255,0.5)]
                            cursor-pointer"
                    >
                        <Paperclip size={20} className="drop-shadow-lg" />
                        <span className="truncate max-w-xs">
                            {image ? `Selected: ${image.name}` : 'Upload an Image'}
                        </span>
                    </button>
                </div>
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full flex justify-center items-center px-6 py-4
                        bg-gradient-to-r from-[rgba(130,160,210,0.7)] to-[rgba(180,220,255,0.7)]
                        rounded-3xl
                        text-white font-bold text-lg
                        shadow-lg
                        hover:scale-[1.03]
                        hover:shadow-[0_0_20px_rgba(180,220,255,0.8)]
                        active:scale-[0.97]
                        transition duration-300
                        disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? <Spinner /> : 'Report Lost Item'}
                </button>
            </form>

            {/* Animations for blobs */}
            <style>{`
                @keyframes blob {
                    0%, 100% {
                        transform: translate(0px, 0px) scale(1);
                    }
                    33% {
                        transform: translate(30px, -20px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
            `}</style>
        </motion.div>
    );
};

export default ReportLostItemForm;
