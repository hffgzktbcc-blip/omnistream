export interface SportsTeam {
  name: string;
  shortName?: string;
  logo?: string;
  score?: string | number;
}

export interface SportsStreamServer {
  name: string;
  url: string;
}

export interface SportsStreamSource {
  source: string;
  id: string;
}

export interface SportsMatch {
  id: string;
  sport: 'rugby' | 'soccer' | 'basketball' | 'football' | 'mma' | 'f1' | 'tennis' | 'cricket' | string;
  league: string;
  homeTeam: SportsTeam;
  awayTeam: SportsTeam;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  statusText: string;
  startTime?: string;
  time?: string;
  banner?: string;
  poster?: string;
  sources?: SportsStreamSource[];
  servers?: SportsStreamServer[];
}

