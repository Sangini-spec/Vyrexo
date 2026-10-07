"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Article, Comment, SubscriptionTier } from '../types';

const App: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [categories, setCategories] = useState<string[]>(['Tech', 'Lifestyle', 'Finance']);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [newArticle, setNewArticle] = useState<Article>({ id: '', title: '', content: '', category: '', readingTime: 0, comments: [] });
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('Free');

  useEffect(() => {
    // Fetch articles from an API or database
    const fetchedArticles: Article[] = [
      { id: '1', title: 'The Future of Tech', content: '...', category: 'Tech', readingTime: 5, comments: [] },
      { id: '2', title: 'Healthy Living Tips', content: '...', category: 'Lifestyle', readingTime: 3, comments: [] },
      { id: '3', title: 'Investing 101', content: '...', category: 'Finance', readingTime: 4, comments: [] }
    ];
    setArticles(fetchedArticles);
  }, []);

  const filteredArticles = useMemo(() => {
    return selectedCategory === 'All' ? articles : articles.filter(article => article.category === selectedCategory);
  }, [articles, selectedCategory]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const handleArticleSelect = (article: Article) => {
    setSelectedArticle(article);
  };

  const handleNewArticleChange = (field: keyof Article, value: string | number) => {
    setNewArticle(prev => ({ ...prev, [field]: value }));
  };

  const handlePublish = () => {
    setArticles(prev => [...prev, { ...newArticle, id: String(prev.length + 1) }]);
    setNewArticle({ id: '', title: '', content: '', category: '', readingTime: 0, comments: [] });
  };

  const handleSubscriptionChange = (tier: SubscriptionTier) => {
    setSubscriptionTier(tier);
  };

  return (
    <div className="bg-slate-950 text-white min-h-screen p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Inkwell</h1>
        <div>
          <select
            className="bg-slate-800 text-white p-2 rounded"
            value={subscriptionTier}
            onChange={(e) => handleSubscriptionChange(e.target.value as SubscriptionTier)}
          >
            <option value="Free">Free</option>
            <option value="$8/mo Paid">$8/mo Paid</option>
            <option value="Founding Member">Founding Member</option>
          </select>
        </div>
      </header>
      <div className="flex">
        <aside className="w-1/4 p-2">
          <h2 className="text-xl mb-2">Categories</h2>
          <ul>
            {['All', ...categories].map(category => (
              <li key={category} className="mb-1">
                <button
                  className={`p-2 w-full text-left ${selectedCategory === category ? 'bg-slate-800' : ''}`}
                  onClick={() => handleCategoryChange(category)}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <main className="w-3/4 p-2">
          <h2 className="text-xl mb-2">Articles</h2>
          <ul>
            {filteredArticles.map(article => (
              <li key={article.id} className="mb-2">
                <button
                  className="w-full text-left p-2 bg-slate-800 hover:bg-slate-700 rounded"
                  onClick={() => handleArticleSelect(article)}
                >
                  <h3 className="text-lg font-semibold">{article.title}</h3>
                  <p className="text-sm">{article.category} - {article.readingTime} min read</p>
                </button>
              </li>
            ))}
          </ul>
        </main>
      </div>
      {selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center">
          <div className="bg-slate-900 p-4 rounded max-w-lg w-full">
            <h2 className="text-2xl mb-2">{selectedArticle.title}</h2>
            <p className="mb-4">{selectedArticle.content}</p>
            <h3 className="text-lg mb-2">Comments</h3>
            <ul className="mb-4">
              {selectedArticle.comments.map((comment, index) => (
                <li key={index} className="mb-1">
                  <p className="text-sm">{comment.content}</p>
                </li>
              ))}
            </ul>
            <button className="bg-red-500 hover:bg-red-600 p-2 rounded" onClick={() => setSelectedArticle(null)}>Close</button>
          </div>
        </div>
      )}
      <div className="mt-4">
        <h2 className="text-xl mb-2">Compose New Article</h2>
        <input
          type="text"
          placeholder="Title"
          className="w-full p-2 mb-2 bg-slate-800 text-white rounded"
          value={newArticle.title}
          onChange={(e) => handleNewArticleChange('title', e.target.value)}
        />
        <textarea
          placeholder="Content"
          className="w-full p-2 mb-2 bg-slate-800 text-white rounded"
          value={newArticle.content}
          onChange={(e) => handleNewArticleChange('content', e.target.value)}
        />
        <select
          className="w-full p-2 mb-2 bg-slate-800 text-white rounded"
          value={newArticle.category}
          onChange={(e) => handleNewArticleChange('category', e.target.value)}
        >
          <option value="">Select Category</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="Reading Time"
          className="w-full p-2 mb-2 bg-slate-800 text-white rounded"
          value={newArticle.readingTime}
          onChange={(e) => handleNewArticleChange('readingTime', Number(e.target.value))}
        />
        <button className="bg-blue-500 hover:bg-blue-600 p-2 rounded" onClick={handlePublish}>Publish</button>
      </div>
    </div>
  );
};

export default App;
