import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Trash2, X } from 'lucide-react';
import StatusPill from '../../components/ui/StatusPill';

const MarketplaceItemCard = ({ item, user, role, onUpdate, onDelete, onChat }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isOwner = item.sellerId === user.uid;
  const isAdmin = role === 'admin';

  const handleContactSeller = () => {
    onChat({
      item,
      chatWith: { uid: item.sellerId, name: item.sellerName, email: item.sellerEmail },
    });
  };

  // Close modal on ESC key press
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="
          bg-white/10
          backdrop-blur-lg
          border border-white/20
          rounded-3xl
          p-6
          shadow-lg
          flex flex-col
          hover:shadow-xl hover:brightness-110
          transition-all duration-300
        "
      >
        <div
          onClick={() => setIsModalOpen(true)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setIsModalOpen(true);
          }}
          className="relative w-full h-52 mb-6 rounded-xl overflow-hidden border border-white/25 shadow-sm cursor-pointer"
          aria-label={`View larger image of ${item.title}`}
        >
          <img
            src={
              item.imageUrl ||
              `https://placehold.co/600x400/1e293b/64748b?text=${encodeURIComponent(
                item.title.charAt(0)
              )}`
            }
            alt={item.title}
            className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
          <div className="absolute top-3 right-3">
            <StatusPill status={item.status} />
          </div>
        </div>

        <div className="flex justify-between items-center mb-3 gap-4">
          <h3
            title={item.title}
            className="text-2xl font-semibold tracking-wide text-white truncate flex-1 select-text"
          >
            {item.title}
          </h3>
          <p className="text-2xl font-semibold text-cyan-400 select-text">
            ₹{item.price.toLocaleString()}
          </p>
        </div>

        <p className="inline-block text-xs font-semibold tracking-wide text-white/70 bg-cyan-900/25 px-4 py-1 rounded-full mb-5 select-none">
          {item.category}
        </p>

        <p className="text-sm text-white/80 flex-grow min-h-[48px] leading-relaxed select-text">
          {item.description}
        </p>

        <p className="text-xs text-white/60 mt-6 font-medium select-text">
          Sold by <span className="font-semibold">{isOwner ? 'You' : item.sellerName}</span>
        </p>

        <div className="mt-7 pt-5 border-t border-white/20 flex flex-col gap-4">
          {!isOwner && item.status === 'Available' && (
            <button
              onClick={handleContactSeller}
              className="
                w-full
                flex items-center justify-center gap-3
                px-6 py-3
                bg-cyan-600 hover:bg-cyan-700 active:bg-cyan-800
                text-white font-semibold
                rounded-2xl shadow-md
                transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-cyan-400
              "
              aria-label="Contact Seller"
            >
              <MessageSquare size={20} />
              Contact Seller
            </button>
          )}

          {(isOwner || isAdmin) && (
            <div className="flex items-center gap-5">
              {isOwner && item.status === 'Available' && (
                <button
                  onClick={() => onUpdate(item.id, { status: 'Sold' })}
                  className="
                    flex-1
                    px-6 py-3
                    bg-gradient-to-r from-green-600 to-green-700
                    hover:from-green-700 hover:to-green-800
                    text-white font-semibold
                    rounded-2xl shadow-md
                    transition-colors duration-300
                    focus:outline-none focus:ring-2 focus:ring-green-400
                  "
                  aria-label="Mark as Sold"
                >
                  Mark as Sold
                </button>
              )}
              <button
                onClick={() => onDelete(item)}
                className="
                  p-3
                  text-red-500
                  hover:text-red-600 hover:bg-red-600/20
                  rounded-2xl
                  transition-colors duration-200
                  focus:outline-none focus:ring-2 focus:ring-red-400
                "
                aria-label="Delete Item"
              >
                <Trash2 size={22} />
              </button>
            </div>
          )}
        </div>
      </motion.div>

      {/* Modal for image */}
      {isModalOpen && (
        <div
          onClick={() => setIsModalOpen(false)}
          className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4 cursor-pointer"
          aria-modal="true"
          role="dialog"
          tabIndex={-1}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl max-h-full w-full rounded-lg shadow-lg"
          >
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-3 right-3 text-white hover:text-cyan-400 focus:outline-none"
              aria-label="Close image preview"
            >
              <X size={32} />
            </button>
            <img
              src={
                item.imageUrl ||
                `https://placehold.co/1200x800/1e293b/64748b?text=${encodeURIComponent(
                  item.title.charAt(0)
                )}`
              }
              alt={item.title}
              className="object-contain max-h-[80vh] w-full rounded-lg"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default MarketplaceItemCard;
