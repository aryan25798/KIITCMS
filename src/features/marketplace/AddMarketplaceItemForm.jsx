import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Spinner from '../../components/ui/Spinner';
import { Paperclip } from 'lucide-react';
import { cloudinaryConfig } from '../../config';  // import your cloudinary config

const MARKETPLACE_CATEGORIES = ['Textbooks', 'Electronics', 'Furniture', 'Musical Instruments', 'Other'];

const AddMarketplaceItemForm = ({ user, onItemAdded }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(MARKETPLACE_CATEGORIES[0]);
  const [image, setImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !price) {
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

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Image upload failed');
        }

        const data = await response.json();
        imageUrl = data.secure_url;
      }

      await addDoc(collection(db, 'marketplaceItems'), {
        title,
        description,
        price: parseFloat(price),
        category,
        imageUrl,
        status: 'Available',
        sellerId: user.uid,
        sellerName: user.displayName,
        sellerEmail: user.email,
        createdAt: serverTimestamp(),
      });

      onItemAdded();
      setTitle('');
      setDescription('');
      setPrice('');
      setCategory(MARKETPLACE_CATEGORIES[0]);
      setImage(null);
    } catch (err) {
      console.error('Error adding marketplace item:', err);
      setError('Failed to add item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto bg-gradient-to-br from-slate-900/90 to-slate-800/80 backdrop-blur-md border border-cyan-600 rounded-3xl p-8 shadow-xl"
    >
      <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-8 text-center drop-shadow-lg">
        Add a New Item for Sale
      </h3>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="text-red-500 bg-red-900/30 p-4 rounded-lg font-semibold text-center tracking-wide drop-shadow-md">
            {error}
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="itemTitle"
              className="block mb-2 text-sm font-semibold text-cyan-400 uppercase tracking-wide"
            >
              Item Title
            </label>
            <input
              id="itemTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-cyan-600 bg-slate-900/70 px-4 py-3 text-white placeholder-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
              placeholder="E.g. Vintage Guitar"
              required
            />
          </div>
          <div>
            <label
              htmlFor="price"
              className="block mb-2 text-sm font-semibold text-cyan-400 uppercase tracking-wide"
            >
              Price (₹)
            </label>
            <input
              id="price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-cyan-600 bg-slate-900/70 px-4 py-3 text-white placeholder-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
              placeholder="Enter price"
              required
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="itemCategory"
            className="block mb-2 text-sm font-semibold text-cyan-400 uppercase tracking-wide"
          >
            Category
          </label>
          <select
            id="itemCategory"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-cyan-600 bg-slate-900/70 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
          >
            {MARKETPLACE_CATEGORIES.map((c) => (
              <option key={c} className="bg-slate-900 text-white">
                {c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="itemDescription"
            className="block mb-2 text-sm font-semibold text-cyan-400 uppercase tracking-wide"
          >
            Description
          </label>
          <textarea
            id="itemDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-cyan-600 bg-slate-900/70 px-4 py-3 h-28 text-white placeholder-cyan-400 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
            placeholder="Describe your item in detail"
            required
          />
        </div>
        <div>
          <label
            htmlFor="itemImage"
            className="block mb-2 text-sm font-semibold text-cyan-400 uppercase tracking-wide"
          >
            Image
          </label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => setImage(e.target.files[0])}
            className="hidden"
            accept="image/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current.click()}
            className="w-full mt-1 flex items-center justify-center gap-3 rounded-lg border border-cyan-600 bg-gradient-to-r from-cyan-700 to-blue-700 px-5 py-3 text-white font-semibold shadow-lg hover:from-cyan-600 hover:to-blue-600 transition-colors focus:outline-none focus:ring-4 focus:ring-cyan-500/70"
          >
            <Paperclip size={20} />
            <span className="truncate max-w-xs">
              {image ? `Selected: ${image.name}` : 'Upload an Image'}
            </span>
          </button>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-4 font-extrabold text-white shadow-xl hover:from-cyan-600 hover:to-blue-600 active:scale-95 transition-transform disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Spinner /> : 'List Item for Sale'}
        </button>
      </form>
    </motion.div>
  );
};

export { AddMarketplaceItemForm, MARKETPLACE_CATEGORIES };
