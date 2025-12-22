// User types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
}

// Conversation types
export interface Conversation {
  phone_number: string;
  contact_name?: string;
  last_message: string;
  last_message_time: string;
  direction: 'in' | 'out';
  unread_count: number;
  is_automated: boolean;
  is_archived: boolean;
  tags?: string | null;
}

// Message types
export interface Message {
  id: number;
  direction: 'in' | 'out';
  content: string | null;
  kind: 'text' | 'template' | 'media';
  template_name?: string;
  created_at: string;
  is_automated: boolean;
  status?: 'sent' | 'delivered' | 'read';
  whatsapp_message_id?: string;
  media_url?: string | null;
  media_type?: string | null;
  media_filename?: string | null;
}

// Contact types
export interface Contact {
  id: number;
  phone_number: string;
  name?: string;
  email?: string;
  notes?: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

// FAQ types
export interface FAQ {
  id: number;
  question: string;
  answer: string;
  keywords?: string | null;
  created_at: string;
}

// Catalog types
export interface CatalogItem {
  id: number;
  name: string;
  price: string;
  image_url: string | null;
  description: string | null;
  created_at: string;
}

// Service Type types
export interface ServiceType {
  id: number;
  name: string;
  duration_minutes: number;
}

// Appointment types
export interface Appointment {
  id: number;
  contact_id: number;
  service_type_id: number | null;
  scheduled_at: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  contact?: {
    name: string;
    phone_number: string;
  };
  service_type?: {
    name: string;
  };
}

// Auth state
export interface AuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  token: string | null;
}

// API Response types
export interface ApiError {
  detail: string;
  status?: number;
}

// Availability types
export interface RecurringAvailability {
  id: number;
  owner_id: number;
  day_of_week: number; // 0 = Monday, 6 = Sunday
  start_time: string; // HH:MM format
  end_time: string; // HH:MM format
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityException {
  id: number;
  owner_id: number;
  date: string; // ISO date string
  is_blocked: boolean;
  custom_slots: string | null; // JSON string with custom slots
  created_at: string;
  updated_at: string;
}

// Navigation types
export type RootStackParamList = {
  '(public)': undefined;
  '(auth)': undefined;
  'login': undefined;
  'dashboard': undefined;
  'conversations': undefined;
  'contacts': undefined;
  'appointments': undefined;
  'settings': undefined;
};

