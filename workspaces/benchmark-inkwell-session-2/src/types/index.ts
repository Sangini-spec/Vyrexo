export interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  readingTime: number;
  comments: Comment[];
}

export interface Comment {
  content: string;
}

export type SubscriptionTier = 'Free' | '$8/mo Paid' | 'Founding Member';
