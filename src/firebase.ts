import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB25MCwq86AcsXhgB_bpR0dmjoeNnIWSMg",
  authDomain: "stock-analyzer-webapp.firebaseapp.com",
  projectId: "stock-analyzer-webapp",
  storageBucket: "stock-analyzer-webapp.firebasestorage.app",
  messagingSenderId: "94466856705",
  appId: "1:94466856705:web:acd92d241482c540aaad00"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
export { auth, analytics, db, app as firebaseApp };