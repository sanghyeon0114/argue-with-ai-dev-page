import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC7IMTymA1gexNudlgeKMTWt1zIC12OJgw",
  authDomain: "argue-with-ai-c66cd.firebaseapp.com",
  projectId: "argue-with-ai-c66cd",
  storageBucket: "argue-with-ai-c66cd.firebasestorage.app",
  messagingSenderId: "506634194325",
  appId: "1:506634194325:web:2322262a8af7243893ba9c",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);