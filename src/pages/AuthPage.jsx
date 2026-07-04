import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import assets from "../data/assets.json";
import "../styles/AuthPage.css"
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;


const authSlides = [
    assets.images.authPets,
    assets.images.authPets2,
    assets.images.photo1,
    assets.images.photo2,
    assets.images.photo3,
    assets.images.photo4,
    assets.images.photo5,
    assets.images.photo6,
    assets.images.photo7,
    assets.images.photo8,
    assets.images.photo9
]


export default function AuthPage({ mode = "login", setPage }) {
    const isSignup = mode === "signup";
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % authSlides.length);
        }, 6000)

        return () => clearInterval(interval);
    }, [authSlides.length]);

    const handleGoogleLogin = async () => {
        try {

            // Getting the token result from logging in from the google provider
            const result = await signInWithPopup(auth, googleProvider);

            // translating the token from the result
            const firebaseUser = result.user;

            // getting the token from the firebaseUser
            const token = await firebaseUser.getIdToken();

            // Making an endpoint translating the 
            const endpoint = isSignup
                ? `${API}/api/auth/google/signup`
                : `${API}/api/auth/google/login`;

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ token }),
            });

            const data = await response.json();
            console.log("GOOGLE AUTH DATA:", data);

            if (!response.ok || !data.success) {
                console.error("Backend Google auth failed:", data.message || "Auth failed");
                return;
            }

            const loggedInUser = data.user || {
                username: firebaseUser.displayName || firebaseUser.email?.split("@")[0],
                email: firebaseUser.email,
                profileImage: firebaseUser.photoURL || "",
                role: "adopter",
            };

            localStorage.setItem("rescuebase_user", JSON.stringify(loggedInUser));

            const role = String(loggedInUser.role || "adopter").trim().toLowerCase();


            if (role === "admin") {
                setPage("admin");
                return;
            }

            if (role === "foster") {
                setPage("foster");
                return;
            }

            // If adopter just straight go in
            setPage("dashboard");
        } catch (error) {
            console.error("Google auth error:", error);
        }
    };

    return (
        <main className="auth-page">
            <header className="auth-header">
                <button className="auth-brand" type="button" onClick={() => setPage("home")}>
                    <img src={assets.logo} alt="RescueBase logo" />
                    <span>RescueBase</span>
                </button>

                <nav className="auth-nav">
                    <button type="button" onClick={() => setPage("home")}>About Us</button>
                    <img src={assets.icons.redPaw} alt="" />
                    <button type="button" onClick={() => setPage("home")}>Browse Pets</button>
                    <img src={assets.icons.redPaw} alt="" />
                </nav>
            </header>

            <section className="auth-shell">
                <div className="auth-image-wrap">
                    {authSlides.map((image, index) => (
                        <img
                            key={index}
                            className={`auth-slide ${index === currentSlide ? "active" : ""}`}
                            src={image}
                            alt="Rescue pets"
                        />
                    ))}
                </div>

                <div className="auth-panel">
                    <button className="auth-back" type="button" onClick={() => setPage("home")}>
                        ←
                    </button>

                    <div className="auth-card">
                        <h1>{isSignup ? "Create Account" : "Log in"}</h1>

                        <button className="google-btn" type="button" onClick={handleGoogleLogin}>
                            <img className="google-icon" src={assets.icons.google} alt="" />
                            {isSignup ? "Sign up with Google" : "Sign in with Google"}
                        </button>

                        <div className="auth-divider">OR</div>
                        {isSignup && (
                            <label className="auth-field">
                                <span>Full Name</span>
                                <input type="text" />
                            </label>
                        )}

                        <label className="auth-field">
                            <span>Email Address</span>
                            <input type="email" />
                        </label>

                        <label className="auth-field auth-password">
                            <span>Password</span>
                            <input type="password" />
                            <button type="button">?</button>
                        </label>

                        <button className="auth-submit" type="button">
                            {isSignup ? "Create Account" : "Log in"}
                        </button>

                        <p className="auth-switch">
                            {isSignup ? "Already have an account?" : "Don't have an account?"}{""}
                            <button
                                type="button"
                                onClick={() => setPage(isSignup ? "login" : "signup")}
                            >
                                {isSignup ? "Log in" : "Create account"}
                            </button>

                        </p>

                    </div>

                </div>

            </section>

        </main>
    )

}