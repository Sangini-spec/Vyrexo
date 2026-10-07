"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPenNib, faNewspaper, faHeart, faComment, faBookmark } from '@fortawesome/free-solid-svg-icons';
import { Article, SubscriptionTier } from '../types';
import ArticleFeed from './ArticleFeed';
import ArticleComposer from './ArticleComposer';
import ReaderViewModal from './ReaderViewModal';
import SubscriptionPicker from './SubscriptionPicker';
import 'tailwindcss/tailwind.css';

const App: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('Free');
  const [showComposer, setShowComposer] = useState(false);

  useEffect(() => {
    // Fetch articles from an API or database
    const fetchArticles = async () => {
      // Placeholder for fetching logic
      const fetchedArticles: Article[] = [
        {
          id: '1',
          title: 'Understanding React Hooks',
          content: 'React hooks are functions that let you use state and other React features...',
          category: 'Tech',
          readingTime: 5,
          comments: [],
          likes: 0,
          bookmarks: 0,
        },
        // More articles...
      ];
      setArticles(fetchedArticles);
    };
    fetchArticles();
  }, []);

  const handleArticleSelect = useCallback((article: Article) => {
    setSelectedArticle(article);
  }, []);

  const handleArticleClose = useCallback(() => {
    setSelectedArticle(null);
  }, []);

  const handleSubscriptionChange = useCallback((tier: SubscriptionTier) => {
    setSubscriptionTier(tier);
  }, []);

  const handleToggleComposer = useCallback(() => {
    setShowComposer((prev) => !prev);
  }, []);

  return (
    <div className="bg-slate-950 text-white min-h-screen p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Inkwell</h1>
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleToggleComposer}
        >
          <FontAwesomeIcon icon={faPenNib} /> New Article
        </button>
      </header>
      <SubscriptionPicker
        currentTier={subscriptionTier}
        onChange={handleSubscriptionChange}
      />
      <ArticleFeed
        articles={articles}
        onArticleSelect={handleArticleSelect}
      />
      {selectedArticle && (
        <ReaderViewModal
          article={selectedArticle}
          onClose={handleArticleClose}
        />
      )}
      {showComposer && (
        <ArticleComposer
          onClose={handleToggleComposer}
          onPublish={(newArticle) => setArticles((prev) => [newArticle, ...prev])}
        />
      )}
    </div>
  );
};

export default App;
