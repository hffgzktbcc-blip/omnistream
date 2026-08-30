export interface AnimeTitle {
  romaji: string;
  english?: string;
  native?: string;
}

export interface AnimeCoverImage {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface AnimeTrailer {
  id?: string;
  site?: string;
  thumbnail?: string;
}

export interface AnimeNextAiringEpisode {
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
}

export interface AnimeEpisode {
  number: number;
  title?: string;
  thumbnail?: string;
  description?: string;
  airDate?: string;
  isFiller?: boolean;
  duration?: number;
}

export type AnimeWatchStatus = 'watching' | 'plan_to_watch' | 'completed' | 'on_hold' | 'dropped';

export interface AnimeWatchProgress {
  animeId: number;
  anime: Anime;
  episodeNumber: number;
  totalEpisodes?: number;
  audioType: 'sub' | 'dub';
  progressPercent?: number;
  status: AnimeWatchStatus;
  updatedAt: number;
  completed?: boolean;
}

export interface AnimeScheduleItem {
  id: number;
  anime: Anime;
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
}

export interface AnimeStudio {
  id: string;
  name: string;
  description?: string;
  banner?: string;
}

export interface Anime {
  id: number;
  tmdbId?: number;
  title: AnimeTitle;
  coverImage: AnimeCoverImage;
  bannerImage?: string;
  description?: string;
  episodes?: number;
  status?: string;
  genres?: string[];
  averageScore?: number;
  seasonYear?: number;
  format?: string;
  duration?: number;
  studios?: string[];
  trailer?: AnimeTrailer;
  nextAiringEpisode?: AnimeNextAiringEpisode;
  episodesList?: AnimeEpisode[];
}
