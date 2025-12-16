import type { FirebaseSystemConfig, FirebaseSystemStats } from '../types/firebase';

// System config seed data (without timestamps - added during seeding)
export type SystemConfigSeed = Omit<FirebaseSystemConfig, 'updatedAt'>;
export type SystemStatsSeed = Omit<FirebaseSystemStats, 'updatedAt'>;

export const systemConfigSeed: SystemConfigSeed = {
  maintenanceMode: false,
  maintenanceMessage: {
    en: 'The site is currently under maintenance. Please try again later.',
    si: 'වෙබ් අඩවිය දැනට නඩත්තු කටයුතු යටතේ පවතී. කරුණාකර පසුව නැවත උත්සාහ කරන්න.',
    ta: 'தளம் தற்போது பராமரிப்பில் உள்ளது. பின்னர் மீண்டும் முயற்சிக்கவும்.',
  },
  features: {
    onlineFill: true,
    userAccounts: true,
    analytics: true,
  },
  cacheVersions: {
    forms: 1,
    categories: 1,
    institutions: 1,
  },
};

export const systemStatsSeed: SystemStatsSeed = {
  totalForms: 0,
  totalUsers: 0,
  totalSubmissions: 0,
  totalDownloads: 0,
};
