import { AppRegistry } from 'react-native';
import '@react-native-firebase/app';

// Firebase is automatically initialized when google-services.json is present
// This file ensures Firebase is imported early in the app lifecycle

export const initializeFirebase = () => {
  // Firebase should already be initialized via google-services.json
  // Just verify it's available
  try {
    const firebase = require('@react-native-firebase/app').default;
    if (firebase.apps.length === 0) {
      console.warn('Firebase not initialized - check google-services.json');
    } else {
      console.log('Firebase initialized successfully');
    }
  } catch (error) {
    console.error('Firebase initialization error:', error);
  }
};

