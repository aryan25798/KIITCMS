// src/features/news/NewsModal.jsx
import React, { useState, useEffect } from 'react';
import { X, Loader2, Bot, Link, Clock } from 'lucide-react';
import { summarizeNews } from '../../services/geminiService';

/**
 * A modal component to display a news article and its AI summary.
 * @param {object} props
 * @param {boolean} props.isOpen - Controls the visibility of the modal.
 * @param {function} props.onClose - Function to call when the modal is closed.
 * @param {object} props.news - The news article object.
 */
const NewsModal = ({ isOpen, onClose, news }) => {
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    if (news) {
      setLoadingSummary(true);
      setSummary(''); // Reset summary
      const getSummary = async () => {
        try {
          const summarizedText = await summarizeNews(news.title, news.description, news.url);
          setSummary(summarizedText);
        } catch (error) {
          console.error("Failed to generate summary:", error);
          setSummary("Failed to generate summary. Please check the full article for details.");
        } finally {
          setLoadingSummary(false);
        }
      };
      getSummary();
    }
  }, [news]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl w-full max-w-3xl h-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-700 animate-fade-in">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h3 className="text-lg font-bold text-white truncate">{news?.title || 'News Article'}</h3>
          <button onClick={onClose} className="p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-6 text-white scrollbar-hide">
          {news && (
            <div className="space-y-6">
              {news.image_url && (
                <img 
                  src={news.image_url} 
                  alt={news.title} 
                  className="w-full h-auto object-cover rounded-lg" 
                  onError={(e) => { e.target.src = 'https://placehold.co/600x400/1e293b/a8a29e?text=No+Image'; }}
                />
              )}
              <h2 className="text-3xl font-bold text-cyan-400">{news.title}</h2>
              <div className="flex items-center gap-4 text-slate-400 text-sm">
                <span className="flex items-center gap-1.5">
                  <Link size={16} /> {news.source}
                </span>
                {news.pubDate && (
                  <span className="flex items-center gap-1.5">
                    <Clock size={16} /> {new Date(news.pubDate).toLocaleDateString()}
                  </span>
                )}
              </div>
              <p className="text-slate-300 text-lg">{news.description}</p>
              
              <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-700 space-y-4">
                <h4 className="text-xl font-semibold flex items-center gap-3 text-white">
                  <Bot className="text-cyan-400" size={24} />
                  AI Summary
                </h4>
                {loadingSummary ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="animate-spin" size={18} />
                    <span>Generating summary...</span>
                  </div>
                ) : (
                  <p className="text-slate-400 whitespace-pre-wrap leading-relaxed">{summary}</p>
                )}
              </div>
              
              <a 
                href={news.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <Link size={20} />
                Read Full Article
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsModal;
