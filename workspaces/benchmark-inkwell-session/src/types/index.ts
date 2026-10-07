export interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  readingTime: number;
  comments: Comment[];
  likes: number;
  bookmarks: number;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  timestamp: Date;
}

export type SubscriptionTier = 'Free' | 'Paid' | 'Founding Member';
