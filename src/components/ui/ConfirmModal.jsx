// src/components/ui/ConfirmModal.jsx
import React from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * A reusable modal component for confirmations, warnings, and messages.
 * @param {object} props
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @param {function} props.onClose - Function to call when the modal is closed.
 * @param {string} props.title - The title of the modal.
 * @param {string} props.message - The main message to display.
 * @param {function} [props.onConfirm] - Optional function for the confirm button. If provided, a confirm button will be shown.
 * @param {string} [props.confirmText='Confirm'] - Text for the confirm button.
 * @param {string} [props.cancelText='Cancel'] - Text for the cancel button.
 * @param {boolean} [props.isLoading=false] - Shows a loading spinner in the confirm button.
 * @param {string} [props.variant='default'] - Can be 'default' (blue), 'danger' (red), or 'success' (green).
 */
const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  isLoading = false,
  variant = 'default' 
}) => {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          confirmButton: 'bg-red-600 hover:bg-red-700',
          cancelButton: 'text-red-400 hover:text-red-300'
        };
      case 'success':
        return {
          confirmButton: 'bg-green-600 hover:bg-green-700',
          cancelButton: 'text-slate-400 hover:text-slate-300'
        };
      case 'default':
      default:
        return {
          confirmButton: 'bg-cyan-600 hover:bg-cyan-700',
          cancelButton: 'text-slate-400 hover:text-slate-300'
        };
    }
  };

  const { confirmButton, cancelButton } = getVariantStyles();

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md p-6 flex flex-col shadow-2xl border border-slate-700 animate-fade-in">
        <div className="flex justify-between items-center pb-4 border-b border-slate-700">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="py-6 text-slate-300">
          <p>{message}</p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className={`px-4 py-2 font-semibold text-sm rounded-md transition-colors ${cancelButton}`}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button
              onClick={onConfirm}
              className={`px-4 py-2 font-semibold text-sm rounded-md transition-colors flex items-center gap-2 ${confirmButton} disabled:bg-gray-600 disabled:cursor-not-allowed`}
              disabled={isLoading}
            >
              {isLoading && <Loader2 size={16} className="animate-spin" />}
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
