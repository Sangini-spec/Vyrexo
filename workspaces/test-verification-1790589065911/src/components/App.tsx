"use client";
import React, { useState, useMemo } from "react";
import { Article, Comment, SubscriptionTier } from "../types";

const categories = ["Technology", "Health", "Finance", "Lifestyle"] as const;
const subscriptionTiers: SubscriptionTier[] = ["Free", "Paid", "Founding"];

export function calculateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function filterArticles(articles: Article[], category: string | "All"): Article[] {
  if (category === "All") return articles;
  return articles.filter(a => a.category === category);
}

export function createNewArticle(
  id: number,
  title: string,
  content: string,
  category: string
): Article {
  return {
    id,
    title,
    content,
    category,
    date: new Date().toISOString(),
    likes: 0,
    liked: false,
    bookmarked: false,
    comments: []
  };
}

const App: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([
    {
      id: 1,
      title: "The Future of AI",
      content: "Artificial intelligence continues to evolve rapidly, impacting industries from healthcare to transportation. This article explores emerging trends and ethical considerations.",
      category: "Technology",
      date: new Date().toISOString(),
      likes: 5,
      liked: false,
      bookmarked: false,
      comments: [
        { id: 1, author: "Alice", text: "Great insights!", date: new Date().toISOString() }
      ]
    },
    {
      id: 2,
      title: "Healthy Eating Habits",
      content: "Developing healthy eating habits can transform your life. Learn how to balance macronutrients, plan meals, and stay hydrated for optimal wellness.",
      category: "Health",
      date: new Date().toISOString(),
      likes: 3,
      liked: false,
      bookmarked: false,
      comments: [
        { id: 1, author: "Bob", text: "Very helpful tips.", date: new Date().toISOString() }
      ]
    }
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string | "All">("All");
  const [showEditor, setShowEditor] = useState(false);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");
  const [editorCategory, setEditorCategory] = useState(categories[0]);
  const [subscription, setSubscription] = useState<SubscriptionTier>("Free");
  const [showReader, setShowReader] = useState(false);
  const [currentArticleId, setCurrentArticleId] = useState<number | null>(null);

  const filteredArticles = useMemo(
    () => filterArticles(articles, selectedCategory),
    [articles, selectedCategory]
  );

  const openReader = (id: number) => {
    setCurrentArticleId(id);
    setShowReader(true);
  };

  const closeReader = () => setShowReader(false);

  const toggleLike = (id: number) => {
    setArticles(prev => prev.map(a =>
      a.id === id
        ? { ...a, liked: !a.liked, likes: a.liked ? a.likes - 1 : a.likes + 1 }
        : a
    ));
  };

  const toggleBookmark = (id: number) => {
    setArticles(prev => prev.map(a =>
      a.id === id
        ? { ...a, bookmarked: !a.bookmarked }
        : a
    ));
  };

  const publishArticle = () => {
    if (!editorTitle.trim() || !editorContent.trim()) return;
    const newId = Math.max(0, ...articles.map(a => a.id)) + 1;
    const newArticle = createNewArticle(newId, editorTitle, editorContent, editorCategory);
    setArticles([newArticle, ...articles]);
    setEditorTitle("");
    setEditorContent("");
    setEditorCategory(categories[0]);
    setShowEditor(false);
  };

  const addComment = (articleId: number, author: string, text: string) => {
    setArticles(prev => prev.map(a =>
      a.id === articleId
        ? {
            ...a,
            comments: [...a.comments, { id: a.comments.length + 1, author, text, date: new Date().toISOString() }]
          }
        : a
    ));
  };

  const currentArticle = useMemo(
    () => articles.find(a => a.id === currentArticleId) || null,
    [articles, currentArticleId]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold">Inkwell Publication Platform</h1>
        <div>
          <button
            onClick={() => setShowEditor(!showEditor)}
            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded mr-2"
          >
            <i className="fa-solid fa-pen-nib"></i> Write
          </button>
          <button
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded"
          >
            <i className="fa-solid fa-star"></i> Subscribe
          </button>
        </div>
      </header>

      <div className="flex mb-4">
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="bg-slate-900 border border-slate-800 p-2 rounded mr-4"
        >
          <option value="All">All</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          value={subscription}
          onChange={e => setSubscription(e.target.value as SubscriptionTier)}
          className="bg-slate-900 border border-slate-800 p-2 rounded"
        >
          {subscriptionTiers.map(tier => (
            <option key={tier} value={tier}>{tier}</option>
          ))}
        </select>
      </div>

      {showEditor && (
        <div className="mb-4 p-4 bg-slate-900 border border-slate-800 rounded">
          <h2 className="text-2xl mb-2">New Article</h2>
          <input
            type="text"
            value={editorTitle}
            onChange={e => setEditorTitle(e.target.value)}
            placeholder="Title"
            className="w-full mb-2 p-2 bg-slate-800 rounded"
          />
          <textarea
            value={editorContent}
            onChange={e => setEditorContent(e.target.value)}
            placeholder="Content"
            className="w-full mb-2 p-2 bg-slate-800 rounded h-32"
          />
          <select
            value={editorCategory}
            onChange={e => setEditorCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 p-2 rounded mb-2"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button
            onClick={publishArticle}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Publish
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredArticles.map(article => (
          <div
            key={article.id}
            className="bg-slate-900 border border-slate-800 rounded p-4 cursor-pointer"
            onClick={() => openReader(article.id)}
          >
            <h3 className="text-xl font-semibold mb-1">{article.title}</h3>
            <p className="text-sm text-slate-400 mb-2">
              {new Date(article.date).toLocaleDateString()} | {article.category}
            </p>
            <p className="text-slate-300 mb-2">
              {article.content.substring(0, 100)}...
            </p>
            <div className="flex justify-between">
              <button
                onClick={e => { e.stopPropagation(); toggleLike(article.id); }}
                className="flex items-center"
              >
                <i className="fa-solid fa-thumbs-up mr-1"></i> {article.likes}
              </button>
              <button
                onClick={e => { e.stopPropagation(); toggleBookmark(article.id); }}
              >
                <i className={article.bookmarked ? "fa-solid fa-bookmark text-yellow-400" : "fa-regular fa-bookmark"}></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {showReader && currentArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4">
          <div className="bg-slate-900 w-full max-w-2xl p-6 rounded relative">
            <button
              onClick={closeReader}
              className="absolute top-2 right-2 text-white text-xl"
            >✕</button>
            <h2 className="text-2xl font-bold mb-2">{currentArticle.title}</h2>
            <p className="text-sm text-slate-400 mb-4">
              {new Date(currentArticle.date).toLocaleDateString()} | {currentArticle.category} | {calculateReadingTime(currentArticle.content)} min read
            </p>
            <div className="prose prose-invert max-w-none mb-4">
              {currentArticle.content.split("\n").map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
            <div className="mb-4">
              <h3 className="text-xl mb-2">Comments</h3>
              {currentArticle.comments.map(c => (
                <div key={c.id} className="mb-2 border-b border-slate-800 pb-2">
                  <p className="text-sm">
                    <strong>{c.author}</strong>{" "}
                    <span className="text-slate-400 text-xs">{new Date(c.date).toLocaleDateString()}</span>
                  </p>
                  <p>{c.text}</p>
                </div>
              ))}
              <div className="mt-2">
                <input
                  id="commentAuthor"
                  type="text"
                  placeholder="Your name"
                  className="w-full mb-2 p-2 bg-slate-800 rounded"
                />
                <textarea
                  id="commentText"
                  placeholder="Your comment"
                  className="w-full mb-2 p-2 bg-slate-800 rounded"
                />
                <button
                  onClick={() => {
                    const authorInput = document.getElementById('commentAuthor') as HTMLInputElement;
                    const textInput = document.getElementById('commentText') as HTMLTextAreaElement;
                    if (authorInput.value && textInput.value && currentArticle) {
                      addComment(currentArticle.id, authorInput.value, textInput.value);
                      authorInput.value = '';
                      textInput.value = '';
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded"
                >
                  Add Comment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
