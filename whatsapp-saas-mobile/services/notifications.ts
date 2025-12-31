import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { authFetch } from '@/lib/auth-store';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Register for push notifications and get the Expo push token
 */
export async function registerForPushNotifications(): Promise<string | null> {
  let token = null;

  // Check if running on a physical device
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions denied');
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    });
    token = tokenData.data;
    console.log('Expo Push Token:', token);
  } catch (error) {
    console.error('Error getting push token:', error);
  }

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#25D366',
    });

    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mensagens',
      description: 'Notificações de novas mensagens do WhatsApp',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#25D366',
      sound: 'default',
    });
  }

  return token;
}

/**
 * Register the push token with the backend
 */
export async function registerPushTokenWithBackend(token: string): Promise<boolean> {
  try {
    // Check if user is logged in before trying to register token
    const { useAuthStore } = await import('@/lib/auth-store');
    const { isLoggedIn, token: authToken } = useAuthStore.getState();
    
    if (!isLoggedIn || !authToken) {
      console.log('⚠️  User not logged in, skipping push token registration');
      return false;
    }
    
    console.log('Attempting to register push token with backend...');
    console.log('Token (first 20 chars):', token.substring(0, 20) + '...');
    console.log('Platform:', Platform.OS);
    console.log('Device:', Device.modelName || 'Unknown Device');
    console.log('User logged in:', isLoggedIn);
    
    const response = await authFetch('/api/push-tokens', {
      method: 'POST',
      body: JSON.stringify({
        token,
        platform: Platform.OS,
        device_name: Device.modelName || 'Unknown Device',
      }),
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (response.ok) {
      try {
        const data = await response.json();
        console.log('✅ Push token registered with backend successfully:', data);
        return true;
      } catch (jsonError) {
        console.log('✅ Push token registered (no response body)');
        return true;
      }
    } else {
      // Get error details from response
      let errorMessage = 'Unknown error';
      let errorData: any = null;
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || JSON.stringify(errorData);
        } else {
          const text = await response.text();
          errorMessage = text || `HTTP ${response.status}: ${response.statusText}`;
        }
      } catch (e) {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      
      console.error('❌ Failed to register push token with backend');
      console.error('Status:', response.status);
      console.error('Error message:', errorMessage);
      console.error('Error data:', errorData);
      
      // Log response headers for debugging
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      
      return false;
    }
  } catch (error: any) {
    console.error('❌ Exception while registering push token:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error?.message);
    console.error('Error stack:', error?.stack);
    
    // Check if it's a network error
    if (error?.message?.includes('Network request failed') || error?.message?.includes('fetch')) {
      console.error('Network error - check internet connection and API URL');
    }
    
    return false;
  }
}

/**
 * Schedule a local notification (for testing)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string> {
  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // Show immediately
  });
  return id;
}

/**
 * Add a notification listener for when notifications are received
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
): Notifications.Subscription {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add a listener for when user interacts with a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
): Notifications.Subscription {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

/**
 * Get the badge count
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set the badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id);
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

