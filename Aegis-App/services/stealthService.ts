import SOSService from './sosService';
import StorageService from './storageService';

export interface StealthNewsItem {
  id: string;
  title: string;
  source: string;
  time: string;
  category: string;
  imageUrl: string;
}

class StealthService {
  private static instance: StealthService;
  private readonly longPressDurationMs = 2000;

  private readonly staticNews: StealthNewsItem[] = [
    {
      id: '1',
      title: 'City Transport Expansion Plan Announced',
      source: 'Metro Brief',
      time: '2h ago',
      category: 'LOCAL',
      imageUrl:
        'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: '2',
      title: 'Public Health Survey Shows Strong Recovery Trends',
      source: 'Daily Bulletin',
      time: '4h ago',
      category: 'HEALTH',
      imageUrl:
        'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: '3',
      title: 'Weekend Sports Fixtures Draw Large Crowds',
      source: 'City Sports Desk',
      time: '6h ago',
      category: 'SPORTS',
      imageUrl:
        'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80',
    },
    {
      id: '4',
      title: 'Technology Forum Highlights AI Safety Standards',
      source: 'Tech Journal',
      time: '1d ago',
      category: 'TECH',
      imageUrl:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80',
    },
  ];

  static getInstance(): StealthService {
    if (!StealthService.instance) {
      StealthService.instance = new StealthService();
    }
    return StealthService.instance;
  }

  getFakeNewsFeed(): StealthNewsItem[] {
    return this.staticNews;
  }

  getHiddenTriggerHoldDuration(): number {
    return this.longPressDurationMs;
  }

  async triggerHiddenSOS(): Promise<{ success: boolean; message: string }> {
    const contacts = await StorageService.getEmergencyContacts();
    if (contacts.length === 0) {
      return {
        success: false,
        message: 'No emergency contacts configured. Add contacts to enable SOS.',
      };
    }

    const alert = await SOSService.triggerSOS('manual', 'stealth-mode');
    if (!alert) {
      return {
        success: false,
        message: 'Failed to trigger SOS. Please try again.',
      };
    }

    return {
      success: true,
      message: 'SOS alert triggered.',
    };
  }
}

export default StealthService.getInstance();
