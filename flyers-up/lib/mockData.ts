/**
 * Mock data for all screens
 * No real backend calls - just placeholder data
 */

export const mockServicePros = [
  {
    id: '1',
    name: 'Sarah Johnson',
    rating: 4.9,
    reviewCount: 127,
    startingPrice: 75,
    photo: undefined,
    badges: ['VERIFIED', '5+ YEARS'],
    category: 'Cleaning',
    bio: 'Professional cleaning services with 8 years of experience.',
  },
  {
    id: '2',
    name: 'Mike Chen',
    rating: 4.8,
    reviewCount: 89,
    startingPrice: 120,
    photo: undefined,
    badges: ['VERIFIED'],
    category: 'Plumbing',
    bio: 'Residential plumbing services and repairs.',
  },
  {
    id: '3',
    name: 'Green Thumb Landscaping',
    rating: 5.0,
    reviewCount: 203,
    startingPrice: 60,
    photo: undefined,
    badges: ['VERIFIED', 'LLC VERIFIED'],
    category: 'Lawn Care',
    bio: 'Full-service lawn care and landscaping.',
  },
];

export const mockCategories = [
  { id: '1', name: 'Cleaning', icon: '🧹' },
  { id: '2', name: 'Plumbing', icon: '🔧' },
  { id: '3', name: 'Lawn Care', icon: '🌿' },
  { id: '4', name: 'Handyman', icon: '🔨' },
  { id: '5', name: 'Electrical', icon: '⚡' },
  { id: '6', name: 'Barber', icon: '💈' },
  { id: '7', name: 'Moving', icon: '📦' },
  { id: '8', name: 'Painting', icon: '🎨' },
];

export const mockJobs = [
  {
    id: '1',
    customerName: 'John Doe',
    service: 'Deep Clean',
    address: '123 Main St, Apt 4B',
    date: '2024-01-15',
    time: '10:00 AM',
    status: 'scheduled' as const,
    total: 150,
  },
  {
    id: '2',
    customerName: 'Jane Smith',
    service: 'Standard Clean',
    address: '456 Oak Ave',
    date: '2024-01-15',
    time: '2:00 PM',
    status: 'in_progress' as const,
    total: 85,
  },
];

export const mockNotifications = [
  {
    id: '1',
    type: 'booking',
    title: 'New booking request',
    message: 'John Doe requested Deep Clean for Jan 15',
    time: '2 hours ago',
    read: false,
  },
  {
    id: '2',
    type: 'payment',
    title: 'Payment received',
    message: '$150 from Standard Clean job',
    time: '1 day ago',
    read: true,
  },
];

export type Notification = {
  id: string;
  type: string;
  title: string;
  read: boolean;
  message?: string;
  description?: string;
  time?: string;
  timestamp?: string | number | Date;
  jobId?: string;
};

// Alias export for consistency
export const MOCK_NOTIFICATIONS = mockNotifications;

export type ServiceCategory = {
  slug: string;
  name: string;
  icon: string;
};

// Additional exports for browse page compatibility
export const MOCK_PROS = mockServicePros.map(pro => ({
  ...pro,
  available: true,
  location: 'Your City',
  avatar: pro.photo || '', // Use photo as avatar, or empty string
  verified: pro.badges?.includes('VERIFIED') || false,
  responseTime: 'Under 1 hour',
}));

export const SERVICE_CATEGORIES = [
  { slug: 'all', name: 'All Services', icon: '🌟' },
  { slug: 'cleaning', name: 'Cleaning', icon: '🧹' },
  { slug: 'plumbing', name: 'Plumbing', icon: '🔧' },
  { slug: 'lawn-care', name: 'Lawn Care', icon: '🌿' },
  { slug: 'handyman', name: 'Handyman', icon: '🔨' },
  { slug: 'photographer', name: 'Photographer', icon: '📸' },
  { slug: 'hvac', name: 'HVAC', icon: '❄️' },
  { slug: 'roofing', name: 'Roofing', icon: '🏠' },
  { slug: 'pest-control', name: 'Pest Control', icon: '🐛' },
  { slug: 'carpet-cleaning', name: 'Carpet Cleaning', icon: '🧽' },
  { slug: 'landscaping', name: 'Landscaping', icon: '🌳' },
  { slug: 'electrical', name: 'Electrical', icon: '⚡' },
  { slug: 'barber', name: 'Barber', icon: '💈' },
  { slug: 'moving', name: 'Moving', icon: '📦' },
  { slug: 'painting', name: 'Painting', icon: '🎨' },
];

export function getProsByCategory(categorySlug: string) {
  if (categorySlug === 'all') {
    return MOCK_PROS;
  }
  
  const categoryMap: Record<string, string> = {
    'cleaning': 'Cleaning',
    'plumbing': 'Plumbing',
    'lawn-care': 'Lawn Care',
    'handyman': 'Handyman',
    'electrical': 'Electrical',
    'barber': 'Barber',
    'moving': 'Moving',
    'painting': 'Painting',
  };
  
  const categoryName = categoryMap[categorySlug];
  if (!categoryName) {
    return MOCK_PROS;
  }
  
  return MOCK_PROS.filter(pro => pro.category === categoryName);
}

// Type definitions
export type MockPro = {
  id: string;
  name: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  photo?: string;
  avatar?: string;
  badges: string[] | Array<{ id: string; label: string; icon?: string; color?: string }>;
  category: string;
  bio: string;
  available?: boolean;
  location?: string;
  verified?: boolean;
  responseTime?: string;
  level?: string | number;
  levelTitle?: string;
  yearsExperience?: number;
  completedJobs?: number;
  insurance?: boolean;
  llcVerified?: boolean;
  backgroundChecked?: boolean;
  certifications?: string[];
};

export type Review = {
  id: string;
  customerName: string;
  userName?: string; // Alias for customerName
  userAvatar?: string;
  rating: number;
  comment: string;
  date: string;
  verified?: boolean;
  helpful?: number;
};

// Mock reviews data
const mockReviews: Review[] = [
  {
    id: '1',
    customerName: 'John D.',
    userName: 'John D.',
    userAvatar: '',
    rating: 5,
    comment: 'Excellent service! Very thorough and professional. Would definitely book again.',
    date: '2024-01-10',
    verified: true,
  },
  {
    id: '2',
    customerName: 'Sarah M.',
    userName: 'Sarah M.',
    userAvatar: '',
    rating: 5,
    comment: 'Amazing work! The pro arrived on time and did an outstanding job. Highly recommend!',
    date: '2024-01-05',
    verified: true,
  },
  {
    id: '3',
    customerName: 'Mike T.',
    userName: 'Mike T.',
    userAvatar: '',
    rating: 4,
    comment: 'Great service overall. Very satisfied with the results.',
    date: '2023-12-28',
    verified: false,
    helpful: 2,
  },
];

// Helper functions
export function getProById(id: string): MockPro | null {
  const pro = mockServicePros.find(p => p.id === id);
  if (!pro) return null;

  // Enhance with additional properties expected by the UI
  return {
    ...pro,
    avatar: pro.photo || '',
    available: true,
    location: 'Your City',
    verified: pro.badges?.includes('VERIFIED') || false,
    responseTime: 'Under 1 hour',
    level: '5',
    levelTitle: 'Expert',
    yearsExperience: 8,
    completedJobs: 250,
    insurance: false,
    llcVerified: pro.badges?.includes('LLC VERIFIED') || false,
    backgroundChecked: false,
    certifications: ['Professional Cleaning Certification', 'Safety Training'],
    badges: typeof pro.badges[0] === 'string' 
      ? pro.badges.map((badge, i) => ({ id: `${id}-badge-${i}`, label: badge as string }))
      : pro.badges,
  };
}

export function getProReviews(proId: string): Review[] {
  // Return mock reviews for the pro
  return mockReviews;
}

// Time slot types and functions
export type TimeSlot = {
  id: string;
  time: string;
  available: boolean;
};

export type AvailableDate = {
  date: string;
  dayName: string;
  dayNumber: string;
  month: string;
  slots: TimeSlot[];
};

export function generateAvailableDates(): AvailableDate[] {
  const dates: AvailableDate[] = [];
  const today = new Date();
  
  // Generate dates for the next 14 days
  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNumber = date.getDate().toString();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const dateString = date.toISOString().split('T')[0];
    
    // Generate time slots (9 AM to 5 PM, every hour)
    const slots: TimeSlot[] = [];
    for (let hour = 9; hour <= 17; hour++) {
      const timeString = hour <= 12 
        ? `${hour}:00 ${hour === 12 ? 'PM' : 'AM'}`
        : `${hour - 12}:00 PM`;
      
      // Make some slots unavailable randomly (for realism)
      const available = Math.random() > 0.2; // 80% available
      
      slots.push({
        id: `${dateString}-${hour}`,
        time: timeString,
        available,
      });
    }
    
    dates.push({
      date: dateString,
      dayName,
      dayNumber,
      month,
      slots,
    });
  }
  
  return dates;
}

// Message board types and data
export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'pro';
  content: string;
  timestamp: string;
  read: boolean;
};

export type Conversation = {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  proId: string;
  proName: string;
  proAvatar?: string;
  bookingId?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  updatedAt: string;
};

// Mock conversations
export const mockConversations: Conversation[] = [
  {
    id: 'conv-1',
    customerId: 'customer-1',
    customerName: 'John Doe',
    customerAvatar: '',
    proId: '1',
    proName: 'Sarah Johnson',
    proAvatar: '',
    bookingId: 'booking-1',
    lastMessage: 'Perfect, thanks!',
    lastMessageTime: '10:10 AM',
    unreadCount: 0,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'conv-2',
    customerId: 'customer-2',
    customerName: 'Jane Smith',
    customerAvatar: '',
    proId: '2',
    proName: 'Mike Chen',
    proAvatar: '',
    bookingId: 'booking-2',
    lastMessage: 'I\'ll be there at 2 PM sharp.',
    lastMessageTime: '1:30 PM',
    unreadCount: 1,
    updatedAt: new Date().toISOString(),
  },
];

// Mock messages
export const mockMessages: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: '1',
      senderName: 'Sarah Johnson',
      senderType: 'pro',
      content: 'Hi! I\'ll be arriving at 10 AM sharp. See you soon!',
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      read: true,
    },
    {
      id: 'msg-2',
      conversationId: 'conv-1',
      senderId: 'customer-1',
      senderName: 'John Doe',
      senderType: 'customer',
      content: 'Perfect, thanks!',
      timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
      read: true,
    },
  ],
  'conv-2': [
    {
      id: 'msg-3',
      conversationId: 'conv-2',
      senderId: 'customer-2',
      senderName: 'Jane Smith',
      senderType: 'customer',
      content: 'Hi, I have a question about the service.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      read: true,
    },
    {
      id: 'msg-4',
      conversationId: 'conv-2',
      senderId: '2',
      senderName: 'Mike Chen',
      senderType: 'pro',
      content: 'I\'ll be there at 2 PM sharp.',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      read: false,
    },
  ],
};

export function getConversations(userId: string, userType: 'customer' | 'pro'): Conversation[] {
  if (userType === 'customer') {
    return mockConversations.filter(conv => conv.customerId === userId);
  } else {
    return mockConversations.filter(conv => conv.proId === userId);
  }
}

export function getMessages(conversationId: string): Message[] {
  return mockMessages[conversationId] || [];
}

/**
 * Get or create a conversation ID between a customer and pro
 * Returns the conversation ID if it exists, or creates a new one
 */
export function getConversationId(customerId: string, proId: string, bookingId?: string): string {
  // Try to find existing conversation
  const existing = mockConversations.find(
    conv => conv.customerId === customerId && conv.proId === proId
  );
  
  if (existing) {
    return existing.id;
  }
  
  // Create new conversation ID (in a real app, this would create it in the database)
  const newConvId = `conv-${customerId}-${proId}`;
  return newConvId;
}

// Job types and functions
export type Job = {
  id: string;
  customerId?: string;
  customerName: string;
  service: string;
  serviceType?: string;
  address: string;
  date: string;
  time: string;
  status: 'scheduled' | 'on_my_way' | 'in_progress' | 'completed' | 'cancelled';
  total: number;
  price?: number;
  category?: string;
  notes?: string;
  pro: {
    id: string;
    name: string;
    avatar?: string;
    rating: number;
    phone?: string;
  };
};

export function getJobById(jobId: string): Job | null {
  const job = mockJobs.find(j => j.id === jobId);
  if (!job) return null;

  // Find the pro for this job (mock association)
  const pro = mockServicePros.find(p => p.id === '1') || mockServicePros[0];
  
  return {
    ...job,
    customerId: 'customer-1', // Default customer ID for mock data
    serviceType: job.service,
    price: job.total,
    category: pro.category,
    notes: 'Please focus on the kitchen and bathrooms.',
    pro: {
      id: pro.id,
      name: pro.name,
      avatar: pro.photo || '',
      rating: pro.rating,
      phone: '555-0123',
    },
  };
}
