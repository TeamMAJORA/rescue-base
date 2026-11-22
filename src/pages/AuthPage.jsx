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
import { EMAIL_FORMAT, suggestEmailFix } from "../utils/emailTypos";

const API = import.meta.env.VITE_BACKEND_URL;


function emailError(email, isSignup) {
    if (!email) return "Enter your email address.";
    if (!EMAIL_FORMAT.test(email)) return "Enter an email like name@example.com.";
    const suggestion = isSignup ? suggestEmailFix(email) : "";
    return suggestion ? `Check your email: did you mean ${suggestion}?` : "";
}
const RESEND_COOLDOWN_SECONDS = 30;
const MIN_PASSWORD_LENGTH = 6;

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
    if (/too many|locked|try again in/i.test(message)) return message; // "Too many wrong codes. Try again in 15 minutes."
    const triesLeft = message.match(/\d+ tr(?:y|ies) left/i)?.[0];
    if (triesLeft) return `That code didn't work. ${triesLeft}.`;
    if (/expire/i.test(message)) return "That code has expired. Resend a new one.";
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
}

export default function AuthPage({ mode = "login", setPage }) {
    const isSignup = mode === "signup";
    const fieldId = useId();

    // Which screen is showing, and which way the last move went (for the drill animation)
    const [step, setStep] = useState("form"); // form | forgot | code | new-password
    const [direction, setDirection] = useState("forward");
    const stepRef = useRef(null);
    const previousMode = useRef(mode);

    const [currentSlide, setCurrentSlide] = useState(0);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
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
        setCodeStatus({ tone: "ok", text: `We sent a 6-digit code to ${targetEmail}.` });
        setResendIn(RESEND_COOLDOWN_SECONDS); // a code was just sent
        goTo("code", "forward");
    }

    // ----- validation (shown after a field is left, or on submit) -----
    const passwordRule = `At least ${MIN_PASSWORD_LENGTH} characters`;
    const errors = {
        fullName: cleanName(fullName) ? "" : "Enter your full name.",
        email: emailError(cleanEmail(email), isSignup),
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
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer " + token,
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
        redirectByRole(data.user, data.token);
    }

    async function handleGoogleLogin() {
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
        } finally {
            setLoading(false);
        }
    }

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
                throw new Error(data.message || "Authentication failed.");
            }

            if (isSignup) {
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
        } finally {
            setLoading(false);
        }
    }

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
        } finally {
            setLoading(false);
        }
    }

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

            <section className="auth-shell">
                <div className="auth-image-wrap">
                    {authSlides.map((image, index) => (
                        <img
                            key={index}
                            className={"auth-slide " + (index === currentSlide ? "active" : "")}
                            src={image}
                            alt=""
                        />
                    ))}
                </div>

                <div className="auth-panel">
                    <div className="auth-card">
                        <button className="auth-back" type="button" onClick={handleBack}>
                            <Icon name="arrow-left" /> Back
                        </button>

                        <div key={`${mode}-${step}`} ref={stepRef} className={`auth-step rb-drill-${direction}`}>
                            {screens[step]()}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
