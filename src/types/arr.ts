export interface ArrConfig {
  sonarrUrl: string;
  sonarrApiKey: string;
  radarrUrl: string;
  radarrApiKey: string;
  autoSearchOnAdd: boolean;
  defaultSonarrProfileId?: number;
  defaultRadarrProfileId?: number;
  defaultSonarrRootFolder?: string;
  defaultRadarrRootFolder?: string;
}

export interface SonarrSeries {
  id: number;
  title: string;
  sortTitle?: string;
  status: string;
  overview?: string;
  network?: string;
  airTime?: string;
  images: Array<{ coverType: string; url?: string; remoteUrl?: string }>;
  seasons: Array<{
    seasonNumber: number;
    monitored: boolean;
    statistics?: {
      episodeFileCount: number;
      episodeCount: number;
      totalEpisodeCount: number;
      sizeOnDisk: number;
      percentOfEpisodes: number;
    };
  }>;
  year: number;
  path?: string;
  profileId?: number;
  qualityProfileId?: number;
  seasonFolder: boolean;
  monitored: boolean;
  tvdbId: number;
  tvRageId?: number;
  tvMazeId?: number;
  imdbId?: string;
  cleanTitle?: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings?: { votes: number; value: number };
  statistics?: {
    seasonCount: number;
    episodeFileCount: number;
    episodeCount: number;
    totalEpisodeCount: number;
    sizeOnDisk: number;
    percentOfEpisodes: number;
  };
  nextAiring?: string;
  previousAiring?: string;
}

export interface RadarrMovie {
  id: number;
  title: string;
  originalTitle?: string;
  sortTitle?: string;
  sizeOnDisk?: number;
  status: string;
  overview?: string;
  inCinemas?: string;
  physicalRelease?: string;
  digitalRelease?: string;
  images: Array<{ coverType: string; url?: string; remoteUrl?: string }>;
  year: number;
  hasFile: boolean;
  path?: string;
  monitored: boolean;
  isAvailable: boolean;
  qualityProfileId?: number;
  tmdbId: number;
  imdbId?: string;
  titleSlug?: string;
  genres: string[];
  tags: number[];
  added: string;
  ratings?: { votes: number; value: number };
  movieFile?: {
    id: number;
    relativePath: string;
    size: number;
    dateAdded: string;
    quality?: { quality?: { name: string; resolution: number } };
  };
}

export interface ArrQueueItem {
  id: number;
  seriesId?: number;
  episodeId?: number;
  movieId?: number;
  title: string;
  size: number;
  sizeleft: number;
  timeleft?: string;
  estimatedCompletionTime?: string;
  status: string;
  trackedDownloadStatus?: string;
  trackedDownloadState?: string;
  statusMessages?: Array<{ title: string; messages: string[] }>;
  downloadId?: string;
  protocol?: string;
  downloadClient?: string;
  indexer?: string;
  outputPath?: string;
  type: 'sonarr' | 'radarr';
  mediaTitle?: string;
}

export interface ArrCalendarItem {
  id: number;
  seriesId?: number;
  episodeId?: number;
  movieId?: number;
  title: string;
  seriesTitle?: string;
  seasonNumber?: number;
  episodeNumber?: number;
  airDateUtc?: string;
  inCinemas?: string;
  digitalRelease?: string;
  physicalRelease?: string;
  hasFile?: boolean;
  overview?: string;
  images?: Array<{ coverType: string; url?: string; remoteUrl?: string }>;
  type: 'sonarr' | 'radarr';
}

export interface ArrQualityProfile {
  id: number;
  name: string;
  cutoff?: number;
}

export interface ArrRootFolder {
  id: number;
  path: string;
  freeSpace: number;
  unmappedFolders?: any[];
}
