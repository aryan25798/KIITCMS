// src/features/news/NewsPage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import NewsModal from './NewsModal';
import { fetchNews } from '../../services/newsService';
import { Loader2, Newspaper, Clock } from 'lucide-react';

const NewsPage = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNews, setSelectedNews] = useState(null);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Intersection observer setup for infinite scrolling
  const observer = useRef();
  const lastNewsCardRef = useCallback(node => {
    if (loadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && nextPage) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loadingMore, nextPage]);

  useEffect(() => {
    const getNews = async () => {
      try {
        setLoading(true);
        const { articles, nextPage: newNextPage } = await fetchNews(1);
        setNews(articles);
        setNextPage(newNextPage);
      } catch (err) {
        console.error(err);
        setError("Failed to load news. Please check your network connection.");
      } finally {
        setLoading(false);
      }
    };
    getNews();
  }, []);

  useEffect(() => {
    if (page > 1 && nextPage) {
        setLoadingMore(true);
        const getMoreNews = async () => {
            try {
                const { articles, nextPage: newNextPage } = await fetchNews(nextPage);
                setNews(prevNews => [...prevNews, ...articles]);
                setNextPage(newNextPage);
            } catch (err) {
                console.error(err);
                setError("Failed to load more news.");
            } finally {
                setLoadingMore(false);
            }
        };
        getMoreNews();
    }
  }, [page, nextPage]);

  const handleNewsClick = async (newsArticle) => {
    setSelectedNews(newsArticle);
  };

  const closeModal = () => {
    setSelectedNews(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-slate-300">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-400 p-8">{error}</div>;
  }

  return (
    <>
      <div className="bg-slate-900/50 p-4 sm:p-6 rounded-2xl border border-slate-800/50">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6 flex items-center gap-3">
          <Newspaper size={32} className="text-cyan-400" />
          Student News & Opportunities
        </h2>
        {news.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((article, index) => {
              const isLastCard = news.length === index + 1;
              return (
                <div 
                  key={index} 
                  ref={isLastCard ? lastNewsCardRef : null}
                  className="group bg-slate-800 rounded-xl shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden cursor-pointer border border-transparent hover:border-cyan-500/50"
                  onClick={() => handleNewsClick(article)}
                >
                  <div className="relative w-full h-40">
                    <img 
                      src={article.image_url} 
                      alt={article.title} 
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
                      onError={(e) => { e.target.src = 'https://placehold.co/600x400/1e293b/a8a29e?text=No+Image'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    <span className="absolute bottom-3 left-4 text-xs font-semibold text-white/80">{article.source}</span>
                  </div>
                  
                  <div className="p-5 flex flex-col h-full">
                    <h3 className="font-bold text-lg text-white mb-2 line-clamp-2">{article.title}</h3>
                    <p className="text-sm text-slate-400 flex-grow line-clamp-3">{article.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-slate-800/50 rounded-lg">
            <h3 className="text-xl font-semibold text-white">No News Available</h3>
            <p className="text-slate-400 mt-2">Check back later for the latest updates.</p>
          </div>
        )}
        {loadingMore && (
            <div className="flex justify-center p-8">
                <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
            </div>
        )}
      </div>
      {selectedNews && (
        <NewsModal 
          isOpen={!!selectedNews} 
          onClose={closeModal} 
          news={selectedNews} 
        />
      )}
    </>
  );
};

export default NewsPage;
