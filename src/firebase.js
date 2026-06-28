import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const googleAPI = import.meta.env.VITE_GOOGLE_API_KEY;

const firebaseConfig = {
  apiKey: `${googleAPI}`,
  authDomain: "teammajora-5f136.firebaseapp.com",
  projectId: "teammajora-5f136",
  storageBucket: "teammajora-5f136.firebasestorage.app",
  messagingSenderId: "915408740158",
  appId: "1:915408740158:web:d89026951ac121bd98566f"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();