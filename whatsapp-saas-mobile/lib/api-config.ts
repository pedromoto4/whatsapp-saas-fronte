import Constants from 'expo-constants';

/**
 * Centralized API configuration
 * Use this to get the API base URL consistently across the app
 */

// Backend URL on Railway
const API_URL = 'https://whatsapp-saas-fronte-production.up.railway.app';

export const getApiBaseUrl = (): string => {
  return API_URL;
};

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  ME: '/api/me',
  
  // Health
  HEALTH: '/health',
  
  // Conversations
  CONVERSATIONS: '/api/conversations/',
  CONVERSATION_MESSAGES: (phone: string) => `/api/conversations/${encodeURIComponent(phone)}/messages`,
  CONVERSATION_SEND: (phone: string) => `/api/conversations/${encodeURIComponent(phone)}/send`,
  CONVERSATION_MARK_READ: (phone: string) => `/api/conversations/${encodeURIComponent(phone)}/mark-read`,
  CONVERSATION_ARCHIVE: (phone: string) => `/api/conversations/${encodeURIComponent(phone)}/archive`,
  CONVERSATION_UNARCHIVE: (phone: string) => `/api/conversations/${encodeURIComponent(phone)}/unarchive`,
  CONVERSATION_INFO: (phone: string) => `/api/conversations/${encodeURIComponent(phone)}/info`,
  CONVERSATION_AI_ENABLED: (phone: string) => `/api/conversations/${encodeURIComponent(phone)}/ai-enabled`,
  CONVERSATION_SEND_PRODUCT: (phone: string, productId: number) => `/api/conversations/${encodeURIComponent(phone)}/send-product/${productId}`,
  UNREAD_COUNT: '/api/conversations/unread-count',
  
  // Contacts
  CONTACTS: '/api/contacts/',
  CONTACT_DETAIL: (id: number) => `/api/contacts/${id}`,
  
  // FAQs
  FAQS: '/api/faqs/',
  FAQ_DETAIL: (id: number) => `/api/faqs/${id}`,
  
  // Catalog
  CATALOG: '/api/catalog/',
  CATALOG_DETAIL: (id: number) => `/api/catalog/${id}`,
  
  // Appointments
  APPOINTMENTS: '/api/appointments/',
  APPOINTMENT_DETAIL: (id: number) => `/api/appointments/${id}`,
  APPOINTMENT_SERVICE_TYPES: '/api/appointments/service-types',
  
  // Availability
  AVAILABILITY_RECURRING: '/api/appointments/availability/recurring',
  AVAILABILITY_RECURRING_DETAIL: (id: number) => `/api/appointments/availability/recurring/${id}`,
  AVAILABILITY_EXCEPTIONS: '/api/appointments/availability/exceptions',
  AVAILABILITY_EXCEPTION_DETAIL: (id: number) => `/api/appointments/availability/exceptions/${id}`,
  
  // Settings
  SETTINGS: '/api/settings/',
  
  // WhatsApp
  WHATSAPP_STATUS: '/whatsapp/status',
  WHATSAPP_TEMPLATES: '/whatsapp/templates',
  WHATSAPP_UPLOAD: '/whatsapp/upload',
  WHATSAPP_SEND_MEDIA: '/whatsapp/send-media',
} as const;

// Helper function to build full URL
export const buildUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  return `${baseUrl}${endpoint}`;
};

