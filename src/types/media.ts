export type MediaType = 'movie' | 'tv';

export interface MediaItem {
  id: number;
  media_type: MediaType;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path?: string;
  backdrop_path?: string;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: Array<{ id: number; name: string }>;
  number_of_seasons?: number;
  number_of_episodes?: number;
  runtime?: number;
  status?: string;
  tagline?: string;
  provider?: string;
}

export interface TVSeason {
  season_number: number;
  name: string;
  episode_count: number;
  poster_path?: string;
  episodes?: TVEpisode[];
}

export interface TVEpisode {
  episode_number: number;
  season_number: number;
  name: string;
  overview?: string;
  still_path?: string;
  vote_average?: number;
}
