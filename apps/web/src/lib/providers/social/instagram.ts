import {
  CompetitorPublicData,
  NormalizedAudience,
  NormalizedMetrics,
  NormalizedPost,
  PublishRequest,
  SocialPlatform,
  SocialProvider,
} from './types';

export class LiveInstagramProvider implements SocialProvider {
  platform: SocialPlatform = 'instagram';

  private getGraphUrl(): string {
    const version = process.env.META_GRAPH_VERSION || 'v22.0';
    return `https://graph.facebook.com/${version}`;
  }

  getAuthUrl(state: string): string {
    const appId = process.env.META_APP_ID || '';
    const redirectUri = encodeURIComponent(process.env.META_REDIRECT_URI || '');
    // Current Meta Graph API scopes for Instagram Business/Creator accounts (verified 2026):
    // instagram_business_basic replaces the deprecated instagram_basic (see DEVIATIONS.md D14, P6)
    // instagram_business_content_publish, instagram_business_manage_insights, pages_read_engagement
    const scopes = encodeURIComponent(
      'instagram_business_basic,instagram_business_content_publish,instagram_business_manage_insights,pages_show_list,pages_read_engagement'
    );
    const version = process.env.META_GRAPH_VERSION || 'v22.0';

    return `https://www.facebook.com/${version}/dialog/oauth?client_id=${appId}&redirect_uri=${redirectUri}&scope=${scopes}&state=${encodeURIComponent(state)}&response_type=code`;
  }

  async exchangeCode(code: string): Promise<{
    externalId: string;
    handle: string;
    accessToken: string;
    expiresIn?: number;
  }> {
    const appId = process.env.META_APP_ID || '';
    const appSecret = process.env.META_APP_SECRET || '';
    const redirectUri = process.env.META_REDIRECT_URI || '';

    // Step 1: Exchange code for short-lived token
    const tokenUrl = `${this.getGraphUrl()}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`;
    const tokenRes = await fetch(tokenUrl);
    if (!tokenRes.ok) {
      throw new Error(`Failed to exchange Meta OAuth code: ${await tokenRes.text()}`);
    }
    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    // Step 2: Exchange for long-lived access token (60-day expiry)
    const longLivedUrl = `${this.getGraphUrl()}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${shortLivedToken}`;
    const longLivedRes = await fetch(longLivedUrl);
    const longLivedData = longLivedRes.ok ? await longLivedRes.json() : tokenData;
    const accessToken = longLivedData.access_token;
    const expiresIn = longLivedData.expires_in;

    // Step 3: Fetch linked Instagram Business Account
    const meRes = await fetch(`${this.getGraphUrl()}/me/accounts?access_token=${accessToken}`);
    const meData = await meRes.json();
    const page = meData.data?.[0];
    if (!page?.id) {
      throw new Error('No Facebook Page found linked to this Meta account');
    }

    const igRes = await fetch(
      `${this.getGraphUrl()}/${page.id}?fields=instagram_business_account{id,username}&access_token=${accessToken}`
    );
    const igData = await igRes.json();
    const igAccount = igData.instagram_business_account;

    if (!igAccount?.id) {
      throw new Error(
        'No linked Instagram Business or Creator account found for this Facebook page'
      );
    }

    return {
      externalId: igAccount.id,
      handle: igAccount.username,
      accessToken,
      expiresIn,
    };
  }

  async refreshToken(token: string): Promise<{
    accessToken: string;
    expiresIn?: number;
  }> {
    const appId = process.env.META_APP_ID || '';
    const appSecret = process.env.META_APP_SECRET || '';
    const url = `${this.getGraphUrl()}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${token}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Token refresh failed: ${await res.text()}`);
    }
    const data = await res.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  }

  async fetchPosts(
    token: string,
    externalAccountId: string,
    since?: Date
  ): Promise<NormalizedPost[]> {
    let url = `${this.getGraphUrl()}/${externalAccountId}/media?fields=id,caption,media_type,permalink,timestamp&limit=50&access_token=${token}`;
    if (since) {
      url += `&since=${Math.floor(since.getTime() / 1000)}`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch Instagram posts: ${await res.text()}`);
    }
    const data = await res.json();

    type GraphMediaItem = {
      id: string;
      caption?: string;
      media_type?: string;
      permalink?: string;
      timestamp: string;
    };

    return ((data.data || []) as GraphMediaItem[]).map((item) => {
      const caption = item.caption || '';
      const hashtags = (caption.match(/#[a-zA-Z0-9_]+/g) || []) as string[];
      let mediaType: NormalizedPost['mediaType'] = 'image';
      if (item.media_type === 'VIDEO') mediaType = 'video';
      else if (item.media_type === 'CAROUSEL_ALBUM') mediaType = 'carousel';

      return {
        externalId: item.id,
        caption,
        hashtags,
        mediaType,
        permalink: item.permalink,
        postedAt: item.timestamp,
      };
    });
  }

  async fetchPostInsights(token: string, externalPostId: string): Promise<NormalizedMetrics> {
    // Current Graph API metrics: views / impressions, reach, saved, shares, likes, comments
    const url = `${this.getGraphUrl()}/${externalPostId}/insights?metric=reach,saved,shares,total_interactions&access_token=${token}`;
    const res = await fetch(url);

    let reach = 0;
    let saves = 0;
    let shares = 0;

    if (res.ok) {
      const data = await res.json();
      for (const m of data.data || []) {
        if (m.name === 'reach') reach = m.values?.[0]?.value || 0;
        if (m.name === 'saved') saves = m.values?.[0]?.value || 0;
        if (m.name === 'shares') shares = m.values?.[0]?.value || 0;
      }
    }

    // Likes and comments from post fields directly
    const postRes = await fetch(
      `${this.getGraphUrl()}/${externalPostId}?fields=like_count,comments_count&access_token=${token}`
    );
    let likes = 0;
    let comments = 0;
    if (postRes.ok) {
      const pData = await postRes.json();
      likes = pData.like_count || 0;
      comments = pData.comments_count || 0;
    }

    return {
      likes,
      comments,
      shares,
      saves,
      reach,
      views: reach,
      impressions: reach,
      collectedAt: new Date().toISOString(),
    };
  }

  async fetchAudience(token: string, externalAccountId: string): Promise<NormalizedAudience> {
    const url = `${this.getGraphUrl()}/${externalAccountId}/insights?metric=audience_gender_age,audience_country&period=lifetime&access_token=${token}`;
    const res = await fetch(url);
    if (!res.ok) {
      return {};
    }
    const data = await res.json();
    const result: NormalizedAudience = { age: {}, gender: {}, location: {} };

    for (const m of data.data || []) {
      if (m.name === 'audience_gender_age') {
        const val = m.values?.[0]?.value || {};
        for (const [k, v] of Object.entries(val)) {
          const [gender, ageRange] = k.split('.');
          if (gender) result.gender![gender] = (result.gender![gender] || 0) + (v as number);
          if (ageRange) result.age![ageRange] = (result.age![ageRange] || 0) + (v as number);
        }
      }
      if (m.name === 'audience_country') {
        result.location = m.values?.[0]?.value || {};
      }
    }

    return result;
  }

  async publish(
    token: string,
    externalAccountId: string,
    post: PublishRequest
  ): Promise<{ platformPostId: string; permalink?: string }> {
    // 2-step Instagram publishing: Container Create -> Media Publish
    if (!post.mediaUrl) {
      throw new Error('Instagram requires a publicly reachable media URL for publishing');
    }

    const caption = `${post.caption}\n\n${post.hashtags.join(' ')}`.trim();
    const isVideo = post.mediaType === 'video' || post.mediaType === 'reel';
    const containerParam = isVideo
      ? `video_url=${encodeURIComponent(post.mediaUrl)}&media_type=REELS`
      : `image_url=${encodeURIComponent(post.mediaUrl)}`;

    const createUrl = `${this.getGraphUrl()}/${externalAccountId}/media?${containerParam}&caption=${encodeURIComponent(caption)}&access_token=${token}`;
    const createRes = await fetch(createUrl, { method: 'POST' });
    if (!createRes.ok) {
      throw new Error(`Failed to create Instagram container: ${await createRes.text()}`);
    }
    const createData = await createRes.json();
    const creationId = createData.id;

    // Publish container
    const publishUrl = `${this.getGraphUrl()}/${externalAccountId}/media_publish?creation_id=${creationId}&access_token=${token}`;
    const publishRes = await fetch(publishUrl, { method: 'POST' });
    if (!publishRes.ok) {
      throw new Error(`Failed to publish Instagram media: ${await publishRes.text()}`);
    }
    const pubData = await publishRes.json();

    return {
      platformPostId: pubData.id,
      permalink: `https://instagram.com/p/${pubData.id}`,
    };
  }

  async businessDiscovery(
    token: string,
    ownAccountId: string,
    targetHandle: string
  ): Promise<CompetitorPublicData> {
    // Official Business Discovery API (SRDS D7: public data only, no scraping)
    const fields = `business_discovery.username(${targetHandle}){followers_count,media_count,media{id,caption,like_count,comments_count}}`;
    const url = `${this.getGraphUrl()}/${ownAccountId}?fields=${encodeURIComponent(fields)}&access_token=${token}`;

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Business discovery query failed: ${await res.text()}`);
    }
    const data = await res.json();
    const disc = data.business_discovery || {};

    type BusinessDiscoveryMedia = {
      id: string;
      caption?: string;
      like_count?: number;
      comments_count?: number;
    };

    const recentPosts = ((disc.media?.data || []) as BusinessDiscoveryMedia[])
      .slice(0, 10)
      .map((m) => ({
        externalId: m.id,
        caption: m.caption || '',
        likes: m.like_count || 0,
        comments: m.comments_count || 0,
      }));

    return {
      handle: targetHandle,
      followersCount: disc.followers_count || 0,
      mediaCount: disc.media_count || 0,
      recentPosts,
    };
  }
}
