// News search DB functions
// These connect to the database for news search functionality.
// Falls back to dummy data when DB is unavailable.

export interface NewsSearchParams {
  keyword?: string;
  sido?: string;
  provider?: string;
  direction?: string;
  period?: string;
  date?: string;
  limit?: number;
  offset?: number;
}

export async function searchNews(params: NewsSearchParams) {
  // This would normally connect to the database
  // Throwing to trigger dummy data fallback
  throw new Error('DB connection not configured');
}
