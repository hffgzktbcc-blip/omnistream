export interface UserReadingStats {
  streakDays: number;
  lastActiveDate: string;
  totalPagesRead: number;
  totalChaptersRead: number;
  totalMinutesListened: number;
  dailyGoalPages: number;
  todayPagesRead: number;
}

const STATS_KEY = 'omnistream_reading_stats';

export const statsStorage = {
  getStats(): UserReadingStats {
    try {
      const data = localStorage.getItem(STATS_KEY);
      const today = new Date().toISOString().split('T')[0];
      if (!data) {
        return {
          streakDays: 3,
          lastActiveDate: today,
          totalPagesRead: 142,
          totalChaptersRead: 18,
          totalMinutesListened: 185,
          dailyGoalPages: 25,
          todayPagesRead: 14
        };
      }
      const stats: UserReadingStats = JSON.parse(data);
      if (stats.lastActiveDate !== today) {
        stats.todayPagesRead = 0;
        stats.lastActiveDate = today;
      }
      return stats;
    } catch {
      return {
        streakDays: 1,
        lastActiveDate: new Date().toISOString().split('T')[0],
        totalPagesRead: 0,
        totalChaptersRead: 0,
        totalMinutesListened: 0,
        dailyGoalPages: 20,
        todayPagesRead: 0
      };
    }
  },

  recordPageRead(): void {
    try {
      const stats = this.getStats();
      stats.totalPagesRead += 1;
      stats.todayPagesRead += 1;
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error('Stats update error:', e);
    }
  },

  recordListeningTime(mins: number): void {
    try {
      const stats = this.getStats();
      stats.totalMinutesListened += mins;
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) {
      console.error('Stats update error:', e);
    }
  }
};
