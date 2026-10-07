export interface Comment {
  id: number;
  author: string;
  text: string;
  date: string;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
  date: string;
  likes: number;
  liked: boolean;
  bookmarked: boolean;
  comments: Comment[];
}

export type SubscriptionTier = "Free" | "Paid" | "Founding";
