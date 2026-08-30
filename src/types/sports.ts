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

export interface SportsMatch {
  id: string;
  sport: 'rugby' | 'soccer' | 'basketball' | 'football' | 'mma' | 'f1' | 'tennis' | 'cricket';
  league: string;
  homeTeam: SportsTeam;
  awayTeam: SportsTeam;
  status: 'LIVE' | 'UPCOMING' | 'FINISHED';
  statusText: string;
  startTime?: string;
  banner?: string;
  servers?: SportsStreamServer[];
}
