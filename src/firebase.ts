import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getFunctions } from 'firebase/functions';

// Replace with your actual Firebase project config
// Since we are likely running locally with emulators for testing, the exact config matters less
// but for production deployment, these need to be correct.
const firebaseConfig = {
  apiKey: "AIzaSyCJEBCdTwkz8_7pZe_ua5kiD0sX8cwG3qY",
  authDomain: "ropemaxxing-2b1f1.firebaseapp.com",
  databaseURL: "https://ropemaxxing-2b1f1-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "ropemaxxing-2b1f1",
  storageBucket: "ropemaxxing-2b1f1.appspot.com",
  messagingSenderId: "sender-id",
  appId: "app-id"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const functions = getFunctions(app);

// Uncomment these lines to use local emulators during development
// connectDatabaseEmulator(db, 'localhost', 9000);
// connectFunctionsEmulator(functions, 'localhost', 5001);
