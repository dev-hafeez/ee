import {
  CompetitorPublicData,
  MediaType,
  NormalizedAudience,
  NormalizedMetrics,
  NormalizedPost,
  PublishRequest,
  SocialPlatform,
  SocialProvider,
} from './types';

export class MockProvider implements SocialProvider {
  platform: SocialPlatform;

  constructor(platform: SocialPlatform = 'instagram') {
    this.platform = platform;
  }

  getAuthUrl(state: string): string {
    return `/api/auth/callback/social-mock?platform=${this.platform}&state=${encodeURIComponent(state)}`;
  }

  async exchangeCode(_code: string): Promise<{
    externalId: string;
    handle: string;
    accessToken: string;
    expiresIn?: number;
  }> {
    return {
      externalId: `mock_${this.platform}_acc_001`,
      handle: this.platform === 'instagram' ? 'alex_rivers_creative' : 'AlexRiversOfficial',
      accessToken: `mock_access_token_${this.platform}_xyz789`,
      expiresIn: 5184000, // 60 days
    };
  }

  async refreshToken(token: string): Promise<{
    accessToken: string;
    expiresIn?: number;
  }> {
    return {
      accessToken: `${token}_refreshed`,
      expiresIn: 5184000,
    };
  }

  async fetchPosts(
    _token: string,
    _externalAccountId: string,
    _since?: Date
  ): Promise<NormalizedPost[]> {
    const posts: NormalizedPost[] = [];
    const mediaTypes: MediaType[] = ['reel', 'carousel', 'image', 'video'];
    const now = Date.now();

    for (let i = 1; i <= 20; i++) {
      const daysAgo = i * 2;
      const postedAt = new Date(now - daysAgo * 24 * 3600 * 1000).toISOString();
      const mediaType = mediaTypes[i % mediaTypes.length];

      posts.push({
        externalId: `mock_post_${this.platform}_${i}`,
        caption: `Mock post #${i}: Strategy insights for quantum audience engagement. #growth #ai #content`,
        hashtags: ['#growth', '#ai', '#content', '#marketing'],
        mediaType,
        permalink: `https://${this.platform}.com/p/mock_${i}`,
        postedAt,
      });
    }

    return posts;
  }

  async fetchPostInsights(_token: string, externalPostId: string): Promise<NormalizedMetrics> {
    const seed = externalPostId.length * 137;
    const reach = 2500 + (seed % 1500);
    const likes = Math.floor(reach * 0.06);
    const comments = Math.floor(likes * 0.08);
    const shares = Math.floor(likes * 0.03);
    const saves = Math.floor(likes * 0.04);

    return {
      likes,
      comments,
      shares,
      saves,
      reach,
      views: reach * 1.2,
      impressions: reach * 1.3,
      collectedAt: new Date().toISOString(),
    };
  }

  async fetchAudience(_token: string, _externalAccountId: string): Promise<NormalizedAudience> {
    return {
      age: {
        '18-24': 0.28,
        '25-34': 0.44,
        '35-44': 0.18,
        '45+': 0.1,
      },
      gender: {
        female: 0.52,
        male: 0.45,
        other: 0.03,
      },
      location: {
        'United States': 0.38,
        'United Kingdom': 0.19,
        Pakistan: 0.12,
        Canada: 0.09,
        Germany: 0.06,
      },
    };
  }

  async publish(
    _token: string,
    _externalAccountId: string,
    _post: PublishRequest
  ): Promise<{ platformPostId: string; permalink?: string }> {
    const id = `pub_${Date.now()}`;
    return {
      platformPostId: id,
      permalink: `https://${this.platform}.com/p/${id}`,
    };
  }

  async businessDiscovery(
    _token: string,
    _ownAccountId: string,
    targetHandle: string
  ): Promise<CompetitorPublicData> {
    return {
      handle: targetHandle,
      followersCount: 45200,
      mediaCount: 312,
      publicEngagementRate: 0.042,
      recentPosts: [
        {
          externalId: 'comp_post_1',
          caption: 'High-performing public competitor caption sample.',
          likes: 1850,
          comments: 142,
        },
      ],
    };
  }
}
