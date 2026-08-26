import {
    signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import assets from "../data/assets.json";
import "../styles/AuthPage.css";
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
    assets.images.photo9,
];

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
    const [confirmPassword, setConfirmPassword] = useState("");
    const [otpMode, setOtpMode] = useState(false);
    const [otpEmail, setOtpEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [loginOtpMode, setLoginOtpMode] = useState(false);
    const [loginOtpEmail, setLoginOtpEmail] = useState("");
    const [loginOtp, setLoginOtp] = useState("");
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
    const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
    const [resetPasswordMode, setResetPasswordMode] = useState(false);
    const [resetOtp, setResetOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const handleForgotPassword = async (e) => {
        e.preventDefault();

        if (!forgotPasswordEmail.trim()) {
            alert("Please enter your email.");
            return;
        }

        try {
            setForgotPasswordLoading(true);

            const response = await fetch(
                `${API}/api/auth/forgot-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: forgotPasswordEmail.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to request password reset."
                );
            }

            alert(
                data.message ||
                "If an account exists, password reset instructions have been sent."
            );

            setShowForgotPassword(false);
            setResetPasswordMode(true);
            setSuccess(
                "A password reset OTP has been sent to your email."
            );

        } catch (error) {
            console.error(
                "Forgot password error:",
                error
            );

            alert(
                error.message ||
                "Something went wrong."
            );
        } finally {
            setForgotPasswordLoading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % authSlides.length);
        }, 6000);

        return () => clearInterval(interval);
    }, []);

    function redirectByRole(user, token = null) {

        if (token) {
            localStorage.setItem("token", token);
        }

        localStorage.setItem("rescuebase_user", JSON.stringify(user));

        const role = String(user.role || "adopter").trim().toLowerCase();

        if (role === "admin") {
            setPage("admin");
            return;
        }

        if (role === "foster") {
            setPage("foster");
            return;
        }

        if (role === "staff") {
            setPage("staff");
            return;
        }

        if (role === "volunteer") {
            setPage("volunteer");
            return;
        }

        setPage("dashboard");
    }

    async function finishGoogleLogin(firebaseUser, endpoint) {
        const token = await firebaseUser.getIdToken(true);

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
            },
            body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Authentication failed.");
        }

        const loggedInUser = data.user || {
            username: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split("@")[0] : ""),
            name: firebaseUser.displayName || "",
            email: firebaseUser.email,
            profileImage: firebaseUser.photoURL || "",
            role: "adopter",
            provider: "google",
            verified: true,
        };

        if (data.requiresOtp) {
            setLoginOtpEmail(
                data.email ||
                firebaseUser.email ||
                ""
            );

            setLoginOtpMode(true);
            setSuccess(
                "A verification code has been sent to your email."
            );

            return;
        }

        redirectByRole(data.user, data.token);
    }

    async function handleGoogleLogin() {
        setError("");
        setSuccess("");
        setLoading(true);

        try {
            const result = await signInWithPopup(auth, googleProvider);
            const firebaseUser = result.user;

            const endpoint = isSignup
                ? API + "/api/auth/google/signup"
                : API + "/api/auth/google/login";

            await finishGoogleLogin(firebaseUser, endpoint);
        } catch (err) {
            console.error("Google auth error:", err);
            setError(friendlyAuthError(err));
        } finally {
            setLoading(false);
        }
    }

    async function handleEmailAuth(e) {
        e.preventDefault();

        setError("");
        setSuccess("");

        const cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail || !password) {
            setError("Please fill in both email and password.");
            return;
        }

        if (isSignup && !fullName.trim()) {
            setError("Please enter your full name.");
            return;
        }

        if (isSignup && password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        setLoading(true);

        try {
            const endpoint = isSignup
                ? API + "/api/auth/email/signup"
                : API + "/api/auth/email/login";

            const body = isSignup
                ? {
                    username: fullName.trim(),
                    email: cleanEmail,
                    password,
                    confirmPassword,
                }
                : {
                    email: cleanEmail,
                    password,
                };

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                if (data.needsVerification && data.email) {
                    setOtpEmail(data.email);
                    setOtpMode(true);
                }

                throw new Error(data.message || "Authentication failed.");
            }

            if (isSignup) {
                setOtpEmail(data.email || cleanEmail);
                setOtpMode(true);
                setSuccess("OTP sent. Please check your email.");
                return;
            }

            if (data.requiresOtp) {
                setLoginOtpEmail(data.email || cleanEmail);
                setLoginOtpMode(true);
                setSuccess("A verification code has been sent to your email.");
                return;
            }

            redirectByRole(data.user, data.token);
        } catch (err) {
            console.error("Email auth error:", err);
            setError(err.message || "Authentication failed.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyOtp(e) {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!otpEmail || !otp.trim()) {
            setError("Please enter the OTP sent to your email.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(API + "/api/auth/email/verify-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: otpEmail.trim().toLowerCase(),
                    otp: otp.trim(),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "OTP verification failed.");
            }

            setSuccess("Email verified successfully.");

            if (data.user) {
                redirectByRole(data.user, data.token);
            }
        } catch (err) {
            console.error("Verify OTP error:", err);
            setError(err.message || "OTP verification failed.");
        } finally {
            setLoading(false);
        }
    }

    async function handleVerifyLoginOtp(e) {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!loginOtpEmail || !loginOtp.trim()) {
            setError("Please enter the OTP sent to your email.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                API + "/api/auth/email/verify-login-otp",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: loginOtpEmail.trim().toLowerCase(),
                        otp: loginOtp.trim(),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "OTP verification failed."
                );
            }

            setSuccess("Login verified successfully.");

            redirectByRole(
                data.user,
                data.token
            );

        } catch (err) {
            console.error(
                "Login OTP verification error:",
                err
            );

            setError(
                err.message ||
                "OTP verification failed."
            );
        } finally {
            setLoading(false);
        }
    }

    async function handleResendOtp() {
        setError("");
        setSuccess("");

        if (!otpEmail) {
            setError("Missing email address.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(API + "/api/auth/email/resend-otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: otpEmail.trim().toLowerCase(),
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to resend OTP.");
            }

            setSuccess("New OTP sent to your email.");
        } catch (err) {
            console.error("Resend OTP error:", err);
            setError(err.message || "Failed to resend OTP.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResetPassword(e) {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!forgotPasswordEmail || !resetOtp.trim()) {
            setError("Please enter the OTP sent to your email.");
            return;
        }

        if (!newPassword || !confirmNewPassword) {
            setError("Please enter and confirm your new password.");
            return;
        }

        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch(
                API + "/api/auth/reset-password",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        email: forgotPasswordEmail
                            .trim()
                            .toLowerCase(),
                        otp: resetOtp.trim(),
                        password: newPassword,
                        confirmPassword: confirmNewPassword,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to reset password."
                );
            }

            setSuccess(
                "Password reset successfully. You can now log in."
            );

            setResetPasswordMode(false);
            setForgotPasswordEmail("");
            setResetOtp("");
            setNewPassword("");
            setConfirmNewPassword("");

        } catch (err) {
            console.error(
                "Reset password error:",
                err
            );

            setError(
                err.message ||
                "Failed to reset password."
            );
        } finally {
            setLoading(false);
        }
    }

    if (showForgotPassword) {
        return (
            <main className="auth-page">
                <header className="auth-header">
                    <button
                        className="auth-brand"
                        type="button"
                        onClick={() => setPage("home")}
                    >
                        <img
                            src={assets.logo}
                            alt="RescueBase logo"
                        />
                        <span>RescueBase</span>
                    </button>
                </header>

                <section className="auth-shell">
                    <div className="auth-image-wrap">
                        {authSlides.map((image, index) => (
                            <img
                                key={index}
                                className={
                                    "auth-slide " +
                                    (index === currentSlide
                                        ? "active"
                                        : "")
                                }
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
                                setShowForgotPassword(false);
                                setForgotPasswordEmail("");
                                setError("");
                                setSuccess("");
                            }}
                        >
                            ← Back
                        </button>

                        <div className="auth-card">
                            <h1>Forgot Password?</h1>

                            <p className="auth-subtext">
                                Enter your email address and
                                we'll send you a password reset OTP.
                            </p>

                            {error && (
                                <div className="auth-message auth-message-error">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="auth-message auth-message-success">
                                    {success}
                                </div>
                            )}

                            <form onSubmit={handleForgotPassword}>
                                <label className="auth-field">
                                    <span>Email Address</span>

                                    <input
                                        type="email"
                                        value={forgotPasswordEmail}
                                        onChange={(e) =>
                                            setForgotPasswordEmail(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter your email"
                                    />
                                </label>

                                <button
                                    className="auth-submit"
                                    type="submit"
                                    disabled={forgotPasswordLoading}
                                >
                                    {forgotPasswordLoading
                                        ? "Sending..."
                                        : "Send Reset OTP"}
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    if (resetPasswordMode) {
        return (
            <main className="auth-page">
                <header className="auth-header">
                    <button
                        className="auth-brand"
                        type="button"
                        onClick={() => setPage("home")}
                    >
                        <img
                            src={assets.logo}
                            alt="RescueBase logo"
                        />
                        <span>RescueBase</span>
                    </button>
                </header>

                <section className="auth-shell">
                    <div className="auth-image-wrap">
                        {authSlides.map((image, index) => (
                            <img
                                key={index}
                                className={
                                    "auth-slide " +
                                    (index === currentSlide
                                        ? "active"
                                        : "")
                                }
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
                                setResetPasswordMode(false);
                                setResetOtp("");
                                setNewPassword("");
                                setConfirmNewPassword("");
                                setError("");
                                setSuccess("");
                            }}
                        >
                            ← Back
                        </button>

                        <div className="auth-card">
                            <h1>Reset Password</h1>

                            <p className="auth-subtext">
                                Enter the OTP sent to{" "}
                                {forgotPasswordEmail}.
                            </p>

                            {error && (
                                <div className="auth-message auth-message-error">
                                    {error}
                                </div>
                            )}

                            {success && (
                                <div className="auth-message auth-message-success">
                                    {success}
                                </div>
                            )}

                            <form onSubmit={handleResetPassword}>
                                <label className="auth-field">
                                    <span>Reset OTP</span>

                                    <input
                                        type="text"
                                        value={resetOtp}
                                        onChange={(e) =>
                                            setResetOtp(
                                                e.target.value
                                            )
                                        }
                                        maxLength={6}
                                        placeholder="Enter 6-digit OTP"
                                    />
                                </label>

                                <label className="auth-field auth-password">
                                    <span>New Password</span>

                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) =>
                                            setNewPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Enter new password"
                                    />
                                </label>

                                <label className="auth-field auth-password">
                                    <span>Confirm New Password</span>

                                    <input
                                        type="password"
                                        value={confirmNewPassword}
                                        onChange={(e) =>
                                            setConfirmNewPassword(
                                                e.target.value
                                            )
                                        }
                                        placeholder="Confirm new password"
                                    />
                                </label>

                                <button
                                    className="auth-submit"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Resetting..."
                                        : "Reset Password"}
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    if (loginOtpMode) {
        return (
            <main className="auth-page">
                <header className="auth-header">
                    <button
                        className="auth-brand"
                        type="button"
                        onClick={() => setPage("home")}
                    >
                        <img
                            src={assets.logo}
                            alt="RescueBase logo"
                        />
                        <span>RescueBase</span>
                    </button>
                </header>

                <section className="auth-shell">
                    <div className="auth-image-wrap">
                        {authSlides.map((image, index) => (
                            <img
                                key={index}
                                className={
                                    "auth-slide " +
                                    (index === currentSlide
                                        ? "active"
                                        : "")
                                }
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
                                setLoginOtpMode(false);
                                setLoginOtp("");
                                setLoginOtpEmail("");
                                setError("");
                                setSuccess("");
                            }}
                        >
                            ← Back
                        </button>

                        <div className="auth-card">
                            <h1>Login Verification</h1>

                            <p className="auth-subtext">
                                Enter the OTP sent to{" "}
                                {loginOtpEmail}.
                            </p>

                            {error ? (
                                <div className="auth-message auth-message-error">
                                    {error}
                                </div>
                            ) : null}

                            {success ? (
                                <div className="auth-message auth-message-success">
                                    {success}
                                </div>
                            ) : null}

                            <form onSubmit={handleVerifyLoginOtp}>
                                <label className="auth-field">
                                    <span>OTP Code</span>

                                    <input
                                        type="text"
                                        value={loginOtp}
                                        onChange={(e) =>
                                            setLoginOtp(
                                                e.target.value
                                            )
                                        }
                                        maxLength={6}
                                        placeholder="Enter 6-digit OTP"
                                    />
                                </label>

                                <button
                                    className="auth-submit"
                                    type="submit"
                                    disabled={loading}
                                >
                                    {loading
                                        ? "Verifying..."
                                        : "Verify & Log in"}
                                </button>
                            </form>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    if (otpMode) {
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
                                setOtpMode(false);
                                setOtp("");
                                setError("");
                                setSuccess("");
                            }}
                        >
                            ← Back
                        </button>

                        <div className="auth-card">
                            <h1>Verify Email</h1>
                            <p className="auth-subtext">
                                Enter the OTP sent to {otpEmail}.
                            </p>

                            {error ? <div className="auth-message auth-message-error">{error}</div> : null}
                            {success ? <div className="auth-message auth-message-success">{success}</div> : null}

                            <form onSubmit={handleVerifyOtp}>
                                <label className="auth-field">
                                    <span>OTP Code</span>
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        maxLength={6}
                                        placeholder="Enter 6-digit OTP"
                                    />
                                </label>

                                <button className="auth-submit" type="submit" disabled={loading}>
                                    {loading ? "Verifying..." : "Verify OTP"}
                                </button>
                            </form>

                            <p className="auth-switch">
                                Did not receive the code?
                                <button type="button" onClick={handleResendOtp} disabled={loading}>
                                    Resend OTP
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
                        {success ? <div className="auth-message auth-message-success">{success}</div> : null}

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
                            </label>

                            {isSignup ? (
                                <label className="auth-field auth-password">
                                    <span>Confirm Password</span>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                </label>
                            ) : null}

                            <button className="auth-submit" type="submit" disabled={loading}>
                                {loading ? "Please wait..." : (isSignup ? "Create Account" : "Log in")}
                            </button>
                        </form>

                        <p className="auth-switch">
                            <span>
                                {isSignup
                                    ? "Already have an account?"
                                    : "Do not have an account?"}
                            </span>

                            <button
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setSuccess("");
                                    setPassword("");
                                    setConfirmPassword("");
                                    setPage(isSignup ? "login" : "signup");
                                }}
                            >
                                {isSignup ? "Log in" : "Create account"}
                            </button>

                            {!isSignup && (
                                <button
                                    type="button"
                                    className="forgot-password-btn"
                                    onClick={() => {
                                        setShowForgotPassword(true);
                                        setError("");
                                        setSuccess("");
                                    }}
                                >
                                    Forgot Password?
                                </button>
                            )}
                        </p>
                    </div>
                </div>
            </section>
        </main>
    );
}