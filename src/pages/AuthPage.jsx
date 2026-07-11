import {
    signInWithPopup,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    updateProfile,
} from "firebase/auth";
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

// Maps Firebase's error codes to messages people can actually read over sa comments  lol.
function friendlyAuthError(error) {
    const code = error?.code || "";

    const map = {
        "auth/email-already-in-use": "An account already exists with this email. Try logging in instead.",
        "auth/invalid-email": "That doesn't look like a valid email address.",
        "auth/weak-password": "Password should be at least 6 characters.",
        "auth/wrong-password": "Incorrect email or password.",
        "auth/user-not-found": "Incorrect email or password.",
        "auth/invalid-credential": "Incorrect email or password.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
        "auth/missing-password": "Please enter a password.",
        "auth/popup-closed-by-user": "Sign-in was cancelled.",
    };

    return map[code] || error?.message || "Something went wrong. Please try again.";
}

export default function AuthPage({ mode = "login", setPage }) {
    const isSignup = mode === "signup";
    const [currentSlide, setCurrentSlide] = useState(0);

    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [forgotMode, setForgotMode] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % authSlides.length);
        }, 6000)

        return () => clearInterval(interval);
    }, [authSlides.length]);

    async function finishLogin(firebaseUser, endpoint, extraBody) {
        const body = extraBody || {};
        const token = await firebaseUser.getIdToken();

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
            body: JSON.stringify(Object.assign({ token: token }, body)),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Authentication failed.");
        }

        const loggedInUser = data.user || {
            username: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : ""),
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

        setPage("dashboard");
    }

    const handleGoogleLogin = async () => {
        setError("");
        setLoading(true);

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const firebaseUser = result.user;

            const endpoint = isSignup
                ? API + "/api/auth/google/signup"
                : API + "/api/auth/google/login";

            await finishLogin(firebaseUser, endpoint);
        } catch (err) {
            console.error("Google auth error:", err);
            setError(friendlyAuthError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!email || !password) {
            setError("Please fill in both email and password.");
            return;
        }

        if (isSignup && !fullName.trim()) {
            setError("Please enter your full name.");
            return;
        }

        setLoading(true);

        try {
            if (isSignup) {
                const credential = await createUserWithEmailAndPassword(auth, email, password);

                if (fullName.trim()) {
                    await updateProfile(credential.user, { displayName: fullName.trim() });
                }

                await finishLogin(credential.user, API + "/api/auth/email/signup", {
                    name: fullName.trim(),
                });
            } else {
                const credential = await signInWithEmailAndPassword(auth, email, password);
                await finishLogin(credential.user, API + "/api/auth/email/login");
            }
        } catch (err) {
            console.error("Email auth error:", err);
            setError(friendlyAuthError(err));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");

        if (!forgotEmail) {
            setError("Please enter your email address.");
            return;
        }

        setLoading(true);

        try {
            await sendPasswordResetEmail(auth, forgotEmail);
        } catch (err) {
            if (err && err.code === "auth/invalid-email") {
                setError(friendlyAuthError(err));
                setLoading(false);
                return;
            }
            console.error("Forgot password error:", err);
        }

        setSuccess("If an account exists for that email, a password reset link is on its way.");
        setLoading(false);
    };

    if (forgotMode) {
        return (
            <main className="auth-page">
                <header className="auth-header">
                    <button className="auth-brand" type="button" onClick={() => setPage("home")}>
                        <img src={assets.logo} alt="RescueBase logo" />
                        <span>RescueBase</span>
                    </button>
                </header>

                <section className="auth-shell">
                    <div className="auth-image-wrap">
                        {authSlides.map((image, index) => (
                            <img
                                key={index}
                                className={"auth-slide " + (index === currentSlide ? "active" : "")}
                                src={image}
                                alt="Rescue pets"
                            />
                        ))}
                    </div>

                    <div className="auth-panel">
                        <button
                            className="auth-back"
                            type="button"
                            onClick={() => {
                                setForgotMode(false);
                                setError("");
                                setSuccess("");
                            }}
                        >
                            Back
                        </button>

                        <div className="auth-card">
                            <h1>Reset Password</h1>
                            <p className="auth-subtext">
                                Enter your email and we will send you a link to reset your password.
                            </p>

                            {error ? <div className="auth-message auth-message-error">{error}</div> : null}
                            {success ? <div className="auth-message auth-message-success">{success}</div> : null}

                            {!success ? (
                                <form onSubmit={handleForgotPassword}>
                                    <label className="auth-field">
                                        <span>Email Address</span>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(e) => setForgotEmail(e.target.value)}
                                        />
                                    </label>

                                    <button className="auth-submit" type="submit" disabled={loading}>
                                        {loading ? "Sending..." : "Send Reset Link"}
                                    </button>
                                </form>
                            ) : null}

                            <p className="auth-switch">
                                <button type="button" onClick={() => setForgotMode(false)}>
                                    Back to log in
                                </button>
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

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
                            className={"auth-slide " + (index === currentSlide ? "active" : "")}
                            src={image}
                            alt="Rescue pets"
                        />
                    ))}
                </div>

                <div className="auth-panel">
                    <button className="auth-back" type="button" onClick={() => setPage("home")}>
                        ← Back
                    </button>

                    <div className="auth-card">
                        <h1>{isSignup ? "Create Account" : "Log in"}</h1>

                        <button className="google-btn" type="button" onClick={handleGoogleLogin} disabled={loading}>
                            <img className="google-icon" src={assets.icons.google} alt="" />
                            {isSignup ? "Sign up with Google" : "Sign in with Google"}
                        </button>

                        <div className="auth-divider">OR</div>

                        {error ? <div className="auth-message auth-message-error">{error}</div> : null}

                        <form onSubmit={handleEmailAuth}>
                            {isSignup ? (
                                <label className="auth-field">
                                    <span>Full Name</span>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                    />
                                </label>
                            ) : null}

                            <label className="auth-field">
                                <span>Email Address</span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </label>

                            <label className="auth-field auth-password">
                                <span>Password</span>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                {!isSignup ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setForgotMode(true);
                                            setForgotEmail(email);
                                            setError("");
                                            setSuccess("");
                                        }}
                                    >
                                        ?
                                    </button>
                                ) : null}
                            </label>

                            <button className="auth-submit" type="submit" disabled={loading}>
                                {loading ? "Please wait..." : (isSignup ? "Create Account" : "Log in")}
                            </button>
                        </form>

                        <p className="auth-switch">
                            {isSignup ? "Already have an account?" : "Do not have an account?"}
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
    );

}
