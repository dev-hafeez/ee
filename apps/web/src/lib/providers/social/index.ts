import { LiveInstagramProvider } from './instagram';
import { MockProvider } from './mock';
import { SocialPlatform, SocialProvider } from './types';

export * from './types';
export { MockProvider } from './mock';
export { LiveInstagramProvider } from './instagram';

export function getSocialProvider(platform: SocialPlatform): SocialProvider {
  const mode = process.env.DATA_MODE || 'seed';

  if (mode === 'live') {
    if (platform === 'instagram') {
      return new LiveInstagramProvider();
    }
    // Live Facebook uses Graph API Pages endpoints
    return new LiveInstagramProvider();
  }

  // seed or mock mode
  return new MockProvider(platform);
}
