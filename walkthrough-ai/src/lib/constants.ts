export const SUBSCRIPTION_PLANS = [
  {
    tier: 'FREE' as const,
    name: 'Free',
    priceMonthly: 0,
    creditsPerMonth: 20,
    stripePriceEnvVar: null,
    features: ['1 active project', '5s or 8s videos', 'Gimbal & Handheld camera styles', 'Standard queue priority'],
  },
  {
    tier: 'STARTER' as const,
    name: 'Starter',
    priceMonthly: 29,
    creditsPerMonth: 300,
    stripePriceEnvVar: 'NEXT_PUBLIC_STRIPE_PRICE_STARTER',
    features: ['10 active projects', 'Up to 12s videos', 'All camera styles', 'Priority queue', 'Prompt preview & floorplan editor'],
  },
  {
    tier: 'PRO' as const,
    name: 'Pro',
    priceMonthly: 99,
    creditsPerMonth: 1200,
    stripePriceEnvVar: 'NEXT_PUBLIC_STRIPE_PRICE_PRO',
    features: ['Unlimited projects', 'Up to 20s videos', 'All providers (Veo, Kling, Runway, Hailuo)', 'API access', 'Team seats (up to 5)'],
  },
  {
    tier: 'STUDIO' as const,
    name: 'Studio',
    priceMonthly: 299,
    creditsPerMonth: 4500,
    stripePriceEnvVar: 'NEXT_PUBLIC_STRIPE_PRICE_STUDIO',
    features: ['Everything in Pro', 'Unlimited team seats', 'Webhooks', 'White-label export', 'Dedicated support'],
  },
];

export const SIGNUP_BONUS_CREDITS = 20;

export const DESIGN_STYLES = ['LUXURY', 'MODERN', 'MEDITERRANEAN', 'SCANDINAVIAN', 'MINIMAL', 'COZY'] as const;
export const CAMERA_STYLES = ['GIMBAL', 'DRONE', 'FPV', 'HANDHELD'] as const;
export const VIDEO_DURATIONS = [5, 8, 12, 20] as const;
export const VIDEO_PROVIDERS = ['VEO', 'KLING', 'RUNWAY', 'HAILUO'] as const;
