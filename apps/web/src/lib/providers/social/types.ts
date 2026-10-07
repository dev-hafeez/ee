export type SocialPlatform = 'instagram' | 'facebook';

export type MediaType = 'image' | 'video' | 'carousel' | 'story' | 'reel';

export interface NormalizedPost {
  externalId: string;
  caption: string;
  hashtags: string[];
  mediaType: MediaType;
  permalink?: string;
  postedAt: string;
}

export interface NormalizedMetrics {
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  views?: number | null;
  impressions?: number | null;
  collectedAt: string;
}

export interface NormalizedAudience {
  age?: Record<string, number>;
  gender?: Record<string, number>;
  location?: Record<string, number>;
}

export interface PublishRequest {
  caption: string;
  hashtags: string[];
  mediaUrl?: string;
  mediaType: MediaType;
}

export interface CompetitorPublicData {
  handle: string;
  followersCount: number;
  mediaCount: number;
  publicEngagementRate?: number;
  recentPosts?: Array<{
    externalId: string;
    caption: string;
    likes: number;
    comments: number;
  }>;
}

export interface SocialProvider {
  platform: SocialPlatform;
  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<{
    externalId: string;
    handle: string;
    accessToken: string;
    expiresIn?: number;
  }>;
  refreshToken(token: string): Promise<{
    accessToken: string;
    expiresIn?: number;
  }>;
  fetchPosts(token: string, externalAccountId: string, since?: Date): Promise<NormalizedPost[]>;
  fetchPostInsights(token: string, externalPostId: string): Promise<NormalizedMetrics>;
  fetchAudience(token: string, externalAccountId: string): Promise<NormalizedAudience>;
  publish(
    token: string,
    externalAccountId: string,
    post: PublishRequest
  ): Promise<{ platformPostId: string; permalink?: string }>;
  businessDiscovery(
    token: string,
    ownAccountId: string,
    targetHandle: string
  ): Promise<CompetitorPublicData>;
}
