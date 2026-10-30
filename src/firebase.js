import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const googleAPI = import.meta.env.VITE_GOOGLE_API_KEY;
const authDomainEnv = import.meta.env.VITE_AUTH_DOMAIN_ENV;
const projectEnv = import.meta.env.VITE_PROJECT_ENV;
const storageEnv = import.meta.env.VITE_STORAGE_ENV;
const messageSenderEnv = import.meta.env.VITE_MESSAGE_SENDER_ENV;
const AppEnv = import.meta.env.VITE_APPID_ENV;

const firebaseConfig = {
  apiKey: `${googleAPI}`,
  authDomain: `${authDomainEnv}`,
  projectId: `${projectEnv}`,
  storageBucket: `${storageEnv}`,
  messagingSenderId: `${messageSenderEnv}`,
  appId: `${AppEnv}`
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();