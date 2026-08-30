export interface RSSArticle {
  id: string;
  title: string;
  link: string;
  pubDate?: string;
  author?: string;
  content?: string;
  description?: string;
  thumbnail?: string;
  feedTitle?: string;
  isRead?: boolean;
}

export interface RSSFeed {
  id: string;
  title: string;
  url: string;
  category: 'comics' | 'anime' | 'books' | 'sports' | 'tech' | 'custom';
  description?: string;
  icon?: string;
  articles?: RSSArticle[];
  lastUpdated?: number;
}
