<<<<<<< HEAD
import {
    signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import assets from "../data/assets.json";
import "../styles/AuthPage.css";
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;
=======
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import assets from "../data/assets.json";
import "../styles/AuthPage.css";
import { useEffect, useId, useRef, useState } from "react";
import Icon from "../components/system/Icon";
import OtpInput from "../components/system/OtpInput";
import PasswordInput from "../components/system/PasswordInput";
import Header from "../components/landing/Header";
import { openLandingSection } from "../components/landing/goToSection";

const API = import.meta.env.VITE_BACKEND_URL;
const RESEND_COOLDOWN_SECONDS = 30;
const MIN_PASSWORD_LENGTH = 6;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe

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

<<<<<<< HEAD
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
=======
// Forgiving input: spaces are removed or tidied instead of becoming errors.
// Passwords are never changed (a space can be part of one).
const cleanEmail = (value) => value.replace(/\s+/g, "").toLowerCase();
const cleanName = (value) => value.replace(/\s+/g, " ").trim();

const CODE_COPY = {
    signup: { title: "Verify your email", verifying: "Checking…" },
    login: { title: "Confirm it's you", verifying: "Checking…" },
    reset: { title: "Check your email", verifying: "Checking…" },
};

function friendlyAuthError(error) {
    const map = {
        "auth/invalid-email": "That doesn't look like a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
        "auth/popup-closed-by-user": "Google sign-in was cancelled.",
    };
    return map[error?.code] || error?.message || "Something went wrong. Please try again.";
}

function friendlyCodeError(message = "") {
    if (/expire/i.test(message)) return "That code has expired. Resend a new one.";
    if (/attempt|locked|too many/i.test(message)) return message;
    return "That code didn't work. Check it and try again.";
}

async function postJson(path, body) {
    const response = await fetch(API + path, {
        method: "POST",
        headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
        body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok && data.success !== false, data };
}

// One labelled field with its inline message (error, or a hint that turns green when met)
function AuthField({ id, label, action, error, hint, hintMet, children }) {
    const message = error || hint;
    return (
        <div className={`auth-field${error ? " has-error" : ""}`}>
            <div className="auth-field-head">
                <label htmlFor={id}>{label}</label>
                {action}
            </div>
            <div className="auth-field-control">{children}</div>
            {message && (
                <p id={`${id}-msg`} className={`auth-field-msg${error ? " is-error" : hintMet ? " is-met" : ""}`}>
                    {error ? <Icon name="alert" /> : hintMet ? <Icon name="check" /> : null}
                    {message}
                </p>
            )}
        </div>
    );
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
}

export default function AuthPage({ mode = "login", setPage }) {
    const isSignup = mode === "signup";
<<<<<<< HEAD
=======
    const fieldId = useId();

    // Which screen is showing, and which way the last move went (for the drill animation)
    const [step, setStep] = useState("form"); // form | forgot | code | new-password
    const [direction, setDirection] = useState("forward");
    const stepRef = useRef(null);
    const previousMode = useRef(mode);
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe

    const [currentSlide, setCurrentSlide] = useState(0);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
<<<<<<< HEAD
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

=======
    const [newPassword, setNewPassword] = useState("");
    const [confirmNewPassword, setConfirmNewPassword] = useState("");
    const [touched, setTouched] = useState({});
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState("");
    const [formSuccess, setFormSuccess] = useState("");

    // Code step
    const [codePurpose, setCodePurpose] = useState("signup"); // signup | login | reset
    const [codeEmail, setCodeEmail] = useState("");
    const [code, setCode] = useState("");
    const [codeStatus, setCodeStatus] = useState({ tone: "", text: "" }); // tone: busy | error | ok
    const [resendIn, setResendIn] = useState(0);
    const [resetCode, setResetCode] = useState("");
    const otpRef = useRef(null);
    const googleLoginRef = useRef(null); // lets "Resend" repeat a Google login that needed a code

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((previous) => (previous + 1) % authSlides.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    // Log in ↔ Create account: drill forward to sign-up, back to log in; keep what was typed in email
    useEffect(() => {
        if (previousMode.current === mode) return;
        setDirection(mode === "signup" ? "forward" : "back");
        previousMode.current = mode;
        setStep("form");
        setTouched({});
        setPassword("");
        setConfirmPassword("");
        setFormError("");
        setFormSuccess("");
    }, [mode]);

    // After every move, put focus where the user acts next (first field or first code box)
    useEffect(() => {
        if (step === "code") {
            otpRef.current?.focus();
            return;
        }
        stepRef.current?.querySelector("[data-autofocus], input")?.focus();
    }, [step, mode]);

    // After a check or resend finishes, the boxes are enabled again: put the cursor back in them
    useEffect(() => {
        if (step === "code" && codeStatus.tone !== "busy") otpRef.current?.focus();
    }, [step, codeStatus.tone]);

    useEffect(() => {
        if (resendIn <= 0) return undefined;
        const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendIn]);

    function goTo(nextStep, nextDirection = "forward") {
        setDirection(nextDirection);
        setStep(nextStep);
        setTouched({});
        setFormError("");
    }

    function openCodeStep(purpose, targetEmail) {
        setCodePurpose(purpose);
        setCodeEmail(targetEmail);
        setCode("");
        setCodeStatus({ tone: "", text: "" });
        setResendIn(RESEND_COOLDOWN_SECONDS); // a code was just sent
        goTo("code", "forward");
    }

    // ----- validation (shown after a field is left, or on submit) -----
    const passwordRule = `At least ${MIN_PASSWORD_LENGTH} characters`;
    const errors = {
        fullName: cleanName(fullName) ? "" : "Enter your full name.",
        email: !cleanEmail(email)
            ? "Enter your email address."
            : EMAIL_PATTERN.test(cleanEmail(email)) ? "" : "Enter an email like name@example.com.",
        password: !password
            ? "Enter your password."
            : isSignup && password.length < MIN_PASSWORD_LENGTH ? `Use ${passwordRule.toLowerCase()}.` : "",
        confirmPassword: confirmPassword === password ? "" : "Passwords don't match.",
        newPassword: newPassword.length >= MIN_PASSWORD_LENGTH ? "" : `Use ${passwordRule.toLowerCase()}.`,
        confirmNewPassword: confirmNewPassword === newPassword ? "" : "Passwords don't match.",
    };
    const shownError = (name) => (touched[name] ? errors[name] : "");
    // Leaving a field shows its error only if something was typed; empty fields are flagged on submit.
    // (So clicking "Create an account" or "Back" never flashes an error and shifts the layout.)
    const touch = (name, value) => {
        if (value) setTouched((current) => ({ ...current, [name]: true }));
    };

    // Marks the fields as touched; returns true when they're all valid, otherwise focuses the first problem
    function validate(names) {
        setTouched((current) => ({ ...current, ...Object.fromEntries(names.map((name) => [name, true])) }));
        const firstInvalid = names.find((name) => errors[name]);
        if (firstInvalid) {
            document.getElementById(`${fieldId}-${firstInvalid}`)?.focus();
            return false;
        }
        return true;
    }

    function redirectByRole(user, token = null) {
        if (token) localStorage.setItem("token", token);
        localStorage.setItem("rescuebase_user", JSON.stringify(user));
        const role = String(user.role || "adopter").trim().toLowerCase();
        const pageByRole = { admin: "admin", foster: "foster", staff: "staff", volunteer: "volunteer" };
        setPage(pageByRole[role] || "dashboard");
    }

    // ----- Google -----
    async function finishGoogleLogin(firebaseUser, endpoint) {
        const token = await firebaseUser.getIdToken(true);
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
<<<<<<< HEAD
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

=======
                "ngrok-skip-browser-warning": "true",
            },
            body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) throw new Error(data.message || "Authentication failed.");

        if (data.requiresOtp) {
            googleLoginRef.current = { firebaseUser, endpoint };
            openCodeStep("login", data.email || firebaseUser.email || "");
            return;
        }
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
        redirectByRole(data.user, data.token);
    }

    async function handleGoogleLogin() {
<<<<<<< HEAD
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
=======
        setFormError("");
        setFormSuccess("");
        setLoading(true);
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const endpoint = API + (isSignup ? "/api/auth/google/signup" : "/api/auth/google/login");
            await finishGoogleLogin(result.user, endpoint);
        } catch (error) {
            console.error("Google auth error:", error);
            setFormError(friendlyAuthError(error));
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
        } finally {
            setLoading(false);
        }
    }

<<<<<<< HEAD
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

=======
    // ----- Log in / Create account -----
    async function handleEmailAuth(event) {
        event.preventDefault();
        setFormError("");
        setFormSuccess("");

        const names = isSignup ? ["fullName", "email", "password", "confirmPassword"] : ["email", "password"];
        if (!validate(names)) return;

        const tidyEmail = cleanEmail(email);
        setEmail(tidyEmail);
        if (isSignup) setFullName(cleanName(fullName));
        setLoading(true);

        try {
            const { ok, data } = isSignup
                ? await postJson("/api/auth/email/signup", {
                    username: cleanName(fullName),
                    email: tidyEmail,
                    password,
                    confirmPassword,
                })
                : await postJson("/api/auth/email/login", { email: tidyEmail, password });

            if (!ok) {
                if (data.needsVerification && data.email) {
                    openCodeStep("signup", data.email);
                    return;
                }
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
                throw new Error(data.message || "Authentication failed.");
            }

            if (isSignup) {
<<<<<<< HEAD
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
=======
                openCodeStep("signup", data.email || tidyEmail);
                return;
            }
            if (data.requiresOtp) {
                googleLoginRef.current = null;
                openCodeStep("login", data.email || tidyEmail);
                return;
            }
            redirectByRole(data.user, data.token);
        } catch (error) {
            console.error("Email auth error:", error);
            setFormError(error.message || "Authentication failed.");
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
        } finally {
            setLoading(false);
        }
    }

<<<<<<< HEAD
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
=======
    // ----- Code step -----
    async function verifyCode(fullCode) {
        if (codePurpose === "reset") {
            setResetCode(fullCode);
            setNewPassword("");
            setConfirmNewPassword("");
            goTo("new-password", "forward");
            return;
        }

        setCodeStatus({ tone: "busy", text: CODE_COPY[codePurpose].verifying });
        try {
            const path = codePurpose === "signup" ? "/api/auth/email/verify-otp" : "/api/auth/email/verify-login-otp";
            const { ok, data } = await postJson(path, { email: cleanEmail(codeEmail), otp: fullCode });
            if (!ok) throw new Error(data.message || "");

            setCodeStatus({ tone: "ok", text: "Verified. Signing you in…" });
            if (data.user) redirectByRole(data.user, data.token);
        } catch (error) {
            setCodeStatus({ tone: "error", text: friendlyCodeError(error.message) });
            setCode("");
        }
    }

    async function resendCode() {
        if (resendIn > 0) return;
        setCodeStatus({ tone: "busy", text: "Sending a new code…" });

        try {
            let result;
            if (codePurpose === "signup") {
                result = await postJson("/api/auth/email/resend-otp", { email: cleanEmail(codeEmail) });
            } else if (codePurpose === "reset") {
                result = await postJson("/api/auth/forgot-password", { email: cleanEmail(codeEmail) });
            } else if (googleLoginRef.current) {
                const { firebaseUser, endpoint } = googleLoginRef.current;
                await finishGoogleLogin(firebaseUser, endpoint);
                result = { ok: true };
            } else {
                result = await postJson("/api/auth/email/login", { email: cleanEmail(codeEmail), password });
            }
            if (!result.ok) throw new Error(result.data?.message || "We couldn't send a new code.");

            setCode("");
            setResendIn(RESEND_COOLDOWN_SECONDS);
            setCodeStatus({ tone: "ok", text: "We sent a new code." });
        } catch (error) {
            setCodeStatus({ tone: "error", text: error.message || "We couldn't send a new code." });
        }
    }

    // ----- Forgot password → code → new password -----
    async function handleForgotPassword(event) {
        event.preventDefault();
        setFormError("");
        if (!validate(["email"])) return;

        const tidyEmail = cleanEmail(email);
        setEmail(tidyEmail);
        setLoading(true);
        try {
            const { ok, data } = await postJson("/api/auth/forgot-password", { email: tidyEmail });
            if (!ok) throw new Error(data.message || "We couldn't send a reset code.");
            openCodeStep("reset", tidyEmail);
        } catch (error) {
            setFormError(error.message || "We couldn't send a reset code.");
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
        } finally {
            setLoading(false);
        }
    }

<<<<<<< HEAD
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
=======
    async function handleResetPassword(event) {
        event.preventDefault();
        setFormError("");
        if (!validate(["newPassword", "confirmNewPassword"])) return;

        setLoading(true);
        try {
            const { ok, data } = await postJson("/api/auth/reset-password", {
                email: cleanEmail(codeEmail),
                otp: resetCode,
                password: newPassword,
                confirmPassword: confirmNewPassword,
            });

            if (!ok) {
                const message = data.message || "";
                // A wrong or expired code: go back to the code boxes and say so there
                if (/otp|code|expire|invalid/i.test(message)) {
                    goTo("code", "back");
                    setCode("");
                    setCodeStatus({ tone: "error", text: friendlyCodeError(message) });
                    return;
                }
                throw new Error(message || "We couldn't update your password.");
            }

            setPassword("");
            setNewPassword("");
            setConfirmNewPassword("");
            setResetCode("");
            goTo("form", "back");
            setFormSuccess("Password updated. Log in with your new password.");
        } catch (error) {
            setFormError(error.message || "We couldn't update your password.");
        } finally {
            setLoading(false);
        }
    }

    function handleBack() {
        if (step === "form") setPage("home");
        else if (step === "forgot") goTo("form", "back");
        else if (step === "code") goTo(codePurpose === "reset" ? "forgot" : "form", "back");
        else goTo("code", "back");
    }

    function switchMode() {
        setPage(isSignup ? "login" : "signup");
    }

    // ----- screens -----
    const banner = (
        <>
            {formError && <div className="auth-message auth-message-error" role="alert">{formError}</div>}
            {formSuccess && <div className="auth-message auth-message-success" role="status">{formSuccess}</div>}
        </>
    );

    function renderEmailField(autoFocus = false) {
        const id = `${fieldId}-email`;
        return (
            <AuthField id={id} label="Email address" error={shownError("email")}>
                <input
                    id={id}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    onBlur={(event) => {
                        setEmail((current) => cleanEmail(current));
                        touch("email", event.target.value.trim());
                    }}
                    aria-invalid={Boolean(shownError("email")) || undefined}
                    aria-describedby={shownError("email") ? `${id}-msg` : undefined}
                    data-autofocus={autoFocus || undefined}
                />
            </AuthField>
        );
    }

    function renderPasswordPair(names, values, setters, labels, autoComplete) {
        const [first, second] = names;
        const firstMet = values[0].length >= MIN_PASSWORD_LENGTH;
        const pairMet = values[1].length > 0 && values[1] === values[0];
        return (
            <>
                <AuthField
                    id={`${fieldId}-${first}`}
                    label={labels[0]}
                    error={shownError(first)}
                    hint={passwordRule}
                    hintMet={firstMet}
                >
                    <PasswordInput
                        toggleClassName="auth-eye"
                        id={`${fieldId}-${first}`}
                        value={values[0]}
                        onChange={(event) => setters[0](event.target.value)}
                        onBlur={() => touch(first, values[0])}
                        autoComplete={autoComplete}
                        invalid={Boolean(shownError(first))}
                        hasMessage
                    />
                </AuthField>
                <AuthField
                    id={`${fieldId}-${second}`}
                    label={labels[1]}
                    error={shownError(second)}
                    hint={pairMet ? "Passwords match" : ""}
                    hintMet={pairMet}
                >
                    <PasswordInput
                        toggleClassName="auth-eye"
                        id={`${fieldId}-${second}`}
                        value={values[1]}
                        onChange={(event) => setters[1](event.target.value)}
                        onBlur={() => touch(second, values[1])}
                        autoComplete={autoComplete}
                        invalid={Boolean(shownError(second))}
                        hasMessage={Boolean(shownError(second)) || pairMet}
                    />
                </AuthField>
            </>
        );
    }

    function renderForm() {
        const passwordId = `${fieldId}-password`;
        return (
            <>
                <h1>{isSignup ? "Create account" : "Log in"}</h1>
                <p className="auth-subtext">
                    {isSignup
                        ? "Join RescueBase to adopt, foster or volunteer."
                        : "Welcome back! Log in to continue."}
                </p>

                <button className="google-btn" type="button" onClick={handleGoogleLogin} disabled={loading}>
                    <img className="google-icon" src={assets.icons.google} alt="" />
                    Continue with Google
                </button>

                <div className="auth-divider"><span>or</span></div>

                {banner}

                <form onSubmit={handleEmailAuth} noValidate>
                    {isSignup && (
                        <AuthField id={`${fieldId}-fullName`} label="Full name" error={shownError("fullName")}>
                            <input
                                id={`${fieldId}-fullName`}
                                type="text"
                                autoComplete="name"
                                value={fullName}
                                onChange={(event) => setFullName(event.target.value)}
                                onBlur={(event) => {
                                    setFullName((current) => cleanName(current));
                                    touch("fullName", event.target.value.trim());
                                }}
                                aria-invalid={Boolean(shownError("fullName")) || undefined}
                                aria-describedby={shownError("fullName") ? `${fieldId}-fullName-msg` : undefined}
                            />
                        </AuthField>
                    )}

                    {renderEmailField()}

                    {isSignup ? (
                        renderPasswordPair(
                            ["password", "confirmPassword"],
                            [password, confirmPassword],
                            [setPassword, setConfirmPassword],
                            ["Password", "Confirm password"],
                            "new-password"
                        )
                    ) : (
                        <AuthField
                            id={passwordId}
                            label="Password"
                            error={shownError("password")}
                            action={
                                <button type="button" className="auth-link" onClick={() => goTo("forgot", "forward")}>
                                    Forgot password?
                                </button>
                            }
                        >
                            <PasswordInput
                                toggleClassName="auth-eye"
                                id={passwordId}
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                onBlur={() => touch("password", password)}
                                autoComplete="current-password"
                                invalid={Boolean(shownError("password"))}
                                hasMessage={Boolean(shownError("password"))}
                            />
                        </AuthField>
                    )}

                    <button className="auth-submit" type="submit" disabled={loading}>
                        {loading
                            ? (isSignup ? "Creating account…" : "Logging in…")
                            : (isSignup ? "Create account" : "Log in")}
                    </button>
                </form>

                <p className="auth-switch">
                    <span>{isSignup ? "Already have an account?" : "Do not have an account?"}</span>
                    <button type="button" className="auth-link" onClick={switchMode}>
                        {isSignup ? "Log in" : "Create an account"}
                    </button>
                </p>
            </>
        );
    }

    function renderForgot() {
        return (
            <>
                <h1>Forgot password?</h1>
                <p className="auth-subtext">Enter your email and we'll send you a 6-digit code to reset it.</p>
                {banner}
                <form onSubmit={handleForgotPassword} noValidate>
                    {renderEmailField(true)}
                    <button className="auth-submit" type="submit" disabled={loading}>
                        {loading ? "Sending…" : "Send code"}
                    </button>
                </form>
            </>
        );
    }

    function renderCode() {
        const statusId = `${fieldId}-code-status`;
        const isBusy = codeStatus.tone === "busy";
        return (
            <div className="auth-code">
                <h1>{CODE_COPY[codePurpose].title}</h1>
                <p className="auth-subtext">
                    Enter the 6-digit code we sent to <strong>{codeEmail}</strong>. It expires in 10 minutes.
                </p>

                <form onSubmit={(event) => { event.preventDefault(); if (code.length === 6) verifyCode(code); }}>
                    <OtpInput
                        ref={otpRef}
                        value={code}
                        onChange={(next) => {
                            setCode(next);
                            if (codeStatus.tone === "error") setCodeStatus({ tone: "", text: "" });
                        }}
                        onComplete={verifyCode}
                        disabled={isBusy}
                        invalid={codeStatus.tone === "error"}
                        describedBy={statusId}
                    />
                </form>

                <p id={statusId} className={`auth-code-status${codeStatus.tone ? ` is-${codeStatus.tone}` : ""}`} role="status" aria-live="polite">
                    {codeStatus.tone === "error" && <Icon name="alert" />}
                    {codeStatus.text}
                </p>

                <p className="auth-code-resend">
                    Didn't get a code?{" "}
                    {resendIn > 0 ? (
                        <span className="auth-code-wait">Resend in 0:{String(resendIn).padStart(2, "0")}</span>
                    ) : (
                        <button type="button" className="auth-link is-strong" onClick={resendCode} disabled={isBusy}>
                            Resend
                        </button>
                    )}
                </p>
            </div>
        );
    }

    function renderNewPassword() {
        return (
            <>
                <h1>Set a new password</h1>
                <p className="auth-subtext">For {codeEmail}. Use at least {MIN_PASSWORD_LENGTH} characters.</p>
                {banner}
                <form onSubmit={handleResetPassword} noValidate>
                    {renderPasswordPair(
                        ["newPassword", "confirmNewPassword"],
                        [newPassword, confirmNewPassword],
                        [setNewPassword, setConfirmNewPassword],
                        ["New password", "Confirm new password"],
                        "new-password"
                    )}
                    <button className="auth-submit" type="submit" disabled={loading}>
                        {loading ? "Updating…" : "Update password"}
                    </button>
                </form>
            </>
        );
    }

    const screens = { form: renderForm, forgot: renderForgot, code: renderCode, "new-password": renderNewPassword };

    return (
        <main className="auth-page">
            <Header showActions={false} onNavigate={(sectionId) => openLandingSection(sectionId, setPage)} />
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe

            <section className="auth-shell">
                <div className="auth-image-wrap">
                    {authSlides.map((image, index) => (
                        <img
                            key={index}
                            className={"auth-slide " + (index === currentSlide ? "active" : "")}
                            src={image}
<<<<<<< HEAD
                            alt="Rescue pets"
=======
                            alt=""
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
                        />
                    ))}
                </div>

                <div className="auth-panel">
<<<<<<< HEAD
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
=======
                    <div className="auth-card">
                        <button className="auth-back" type="button" onClick={handleBack}>
                            <Icon name="arrow-left" /> Back
                        </button>

                        <div key={`${mode}-${step}`} ref={stepRef} className={`auth-step rb-drill-${direction}`}>
                            {screens[step]()}
                        </div>
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
                    </div>
                </div>
            </section>
        </main>
    );
<<<<<<< HEAD
}
=======
}
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
