import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// The set_up_firebase tool might provide firestoreDatabaseId in the config, 
// if not, it uses the default one.
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = getFirestore(app, dbId); 
export const auth = getAuth(app);
export const storage = getStorage(app);

// Connectivity check
async function testConnection() {
  try {
    // Attempting to get a dummy doc to verify connection
    await getDocFromServer(doc(db, '_connection_test_', 'check'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore connection check: Client appears to be offline.");
    }
  }
}

testConnection();
