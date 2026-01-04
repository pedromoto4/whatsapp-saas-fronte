import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/auth-store';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import {
  registerForPushNotifications,
  registerPushTokenWithBackend,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '@/services/notifications';
import '../global.css';

// Initialize Firebase early
try {
  require('@react-native-firebase/app');
} catch (error) {
  console.error('Firebase import error:', error);
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
    },
  },
});

function RootLayoutNav() {
  const { loading, checkAuth, isLoggedIn } = useAuthStore();
  const router = useRouter();
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    // Delay checkAuth slightly to ensure Firebase is ready
    const timer = setTimeout(() => {
      checkAuth().catch((error) => {
        console.error('Auth check error:', error);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Initialize push notifications when user is logged in
  useEffect(() => {
    if (!isLoggedIn) {
      console.log('User not logged in, skipping push notification setup');
      return;
    }

    // Register for push notifications
    const setupNotifications = async () => {
      try {
        // Only register on physical devices
        if (!Device.isDevice) {
          console.log('Push notifications require a physical device');
          return;
        }

        // Wait a bit to ensure auth is fully initialized
        await new Promise(resolve => setTimeout(resolve, 1000));

        const token = await registerForPushNotifications();
        if (token) {
          console.log('Push token obtained:', token.substring(0, 20) + '...');
          
          // Register token with backend (will check auth internally)
          const success = await registerPushTokenWithBackend(token);
          if (success) {
            console.log('✅ Push token registered with backend');
          } else {
            console.log('⚠️  Failed to register push token (user may not be fully authenticated yet)');
          }
        }
      } catch (error) {
        console.error('Error setting up push notifications:', error);
      }
    };

    setupNotifications();

    // Function to update badge count
    const updateBadgeCount = async () => {
      try {
        const { authFetch } = await import('@/lib/auth-store');
        const { API_ENDPOINTS } = await import('@/lib/api-config');
        const { setBadgeCount } = await import('@/services/notifications');
        
        const response = await authFetch(API_ENDPOINTS.UNREAD_COUNT);
        if (response.ok) {
          const data = await response.json();
          const unreadCount = data.unread_count || 0;
          await setBadgeCount(unreadCount);
          console.log('Badge count updated:', unreadCount);
        }
      } catch (error) {
        console.error('Error updating badge count:', error);
      }
    };
    
    // Set up notification listeners
    notificationListener.current = addNotificationReceivedListener(async (notification) => {
      console.log('🔔 Notification received in app:', JSON.stringify(notification, null, 2));
      console.log('🔔 Notification title:', notification.request.content.title);
      console.log('🔔 Notification body:', notification.request.content.body);
      console.log('🔔 Notification data:', notification.request.content.data);
      // Update badge count when notification is received
      await updateBadgeCount();
    });
    
    // Update badge count on mount and periodically
    updateBadgeCount();
    const badgeInterval = setInterval(updateBadgeCount, 30000); // Update every 30 seconds

    responseListener.current = addNotificationResponseListener((response) => {
      console.log('Notification response:', response);
      // Handle navigation based on notification data
      const data = response.notification.request.content.data;
      if (data?.type === 'new_message' && data?.phone_number) {
        // Navigate to chat screen when user taps notification
        console.log('Navigating to chat with:', data.phone_number);
        router.push({
          pathname: '/chat',
          params: { phone: data.phone_number },
        });
      }
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (badgeInterval) {
        clearInterval(badgeInterval);
      }
    };
  }, [isLoggedIn]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0B141A',
        }}
      >
        <ActivityIndicator size="large" color="#25D366" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0B141A' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="chat" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayoutNav />
    </QueryClientProvider>
  );
}

