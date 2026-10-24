import { useCallback, useEffect, useState } from "react";
import "../styles/admin/Reports.css";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const TABS = [
    { key: "profile", label: "Profile" },
    { key: "security", label: "Account & security" },
    { key: "notifications", label: "Notifications" },
];

// Email types each role can turn off. Security emails are always sent.
const EMAIL_OPTIONS = {
    adoption: { label: "Adoption updates", hint: "Application status, interview schedules and document requests." },
    petAvailable: { label: "Pet available", hint: "When a pet you are waiting for becomes available." },
    foster: { label: "Foster updates", hint: "Foster assignment changes and vaccination reminders." },
    lostFound: { label: "Lost & Found", hint: "Claims and reunions on your reports." },
    donation: { label: "Donation receipts", hint: "A confirmation after you donate." },
    rescue: { label: "Rescue assignments", hint: "When a rescue is assigned to you." },
    feedback: { label: "Feedback replies", hint: "When the team replies to your feedback." },
};

const ROLE_EMAILS = {
    adopter: ["adoption", "petAvailable", "lostFound", "donation", "feedback"],
    foster: ["foster", "adoption", "lostFound", "donation", "feedback"],
    volunteer: ["rescue", "lostFound", "donation", "feedback"],
    staff: ["rescue", "feedback"],
    admin: [],
};

const ROLE_LABELS = {
    adopter: "Adopter",
    foster: "Foster",
    volunteer: "Volunteer",
    staff: "Staff",
    admin: "Admin",
};

function authHeaders(json = true) {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
    if (json) headers["Content-Type"] = "application/json";
    return headers;
}

function maskEmail(email = "") {
    const [name, domain] = email.split("@");
    if (!domain) return email;
    return `${name.slice(0, 1)}${"•".repeat(Math.max(name.length - 1, 3))}@${domain}`;
}

function initials(name = "") {
    return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "?";
}

// Keep the sidebar name/photo in sync after a save
function syncStoredUser(user) {
    try {
        const stored = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");
        localStorage.setItem("rescuebase_user", JSON.stringify({
            ...stored,
            name: user.name,
            username: user.username,
            profileImage: user.profileImage,
        }));
    } catch {
        // ignore bad stored data
    }
}

async function readJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

async function fetchMe() {
    const response = await fetch(`${API}/api/users/me`, { headers: authHeaders(false) });
    const data = await readJson(response);
    if (!response.ok || !data.user) throw new Error(data.message || "Could not load your account.");
    return data.user;
}

export default function AccountSettings({ onLogout, onApplyRole, extraTabs = [], initialTab = "profile" }) {
    const [tab, setTab] = useState(initialTab);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [notice, setNotice] = useState(null);

    // Profile form
    const [profile, setProfile] = useState({ name: "", username: "", profileImage: "" });
    const [uploading, setUploading] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);

    // Password form
    const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Notification form
    const [prefs, setPrefs] = useState({});
    const [savingPrefs, setSavingPrefs] = useState(false);

    const applyUser = useCallback((next) => {
        setUser(next);
        setProfile({
            name: next.name || "",
            username: next.username || "",
            profileImage: next.profileImage || "",
        });
        setPrefs({ ...(next.emailPrefs || {}) });
    }, []);

    const loadMe = useCallback(() => {
        fetchMe()
            .then((me) => {
                applyUser(me);
                setLoadError("");
            })
            .catch((error) => setLoadError(error.message || "Could not load your account."))
            .finally(() => setLoading(false));
    }, [applyUser]);

    useEffect(() => {
        let alive = true;
        fetchMe()
            .then((me) => { if (alive) applyUser(me); })
            .catch((error) => { if (alive) setLoadError(error.message || "Could not load your account."); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [applyUser]);

    function flash(type, text) {
        setNotice({ type, text });
    }

    function switchTab(key) {
        setTab(key);
        setNotice(null);
    }

    // ---------- Profile ----------
    const profileDirty = user && (
        profile.name !== (user.name || "") ||
        profile.username !== (user.username || "") ||
        profile.profileImage !== (user.profileImage || "")
    );

    async function uploadPhoto(event) {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            flash("error", "Please choose an image file.");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            flash("error", "Photo must be 5 MB or smaller.");
            return;
        }

        setUploading(true);
        try {
            const body = new FormData();
            body.append("image", file);
            body.append("folder", "rescuebase/profiles");
            const response = await fetch(`${API}/api/uploads/image`, {
                method: "POST",
                headers: authHeaders(false),
                body,
            });
            const data = await readJson(response);
            if (!response.ok || !data.imageUrl) throw new Error(data.message || "Upload failed.");
            setProfile((current) => ({ ...current, profileImage: data.imageUrl }));
            flash("info", "Photo uploaded. Press Save changes to keep it.");
        } catch (error) {
            flash("error", error.message || "Upload failed.");
        } finally {
            setUploading(false);
        }
    }

    async function saveProfile() {
        if (!profile.name.trim()) {
            flash("error", "Name is required.");
            return;
        }
        if (profile.username && !/^[a-zA-Z0-9._]{3,30}$/.test(profile.username)) {
            flash("error", "Username must be 3–30 letters, numbers, dots or underscores.");
            return;
        }

        setSavingProfile(true);
        try {
            const response = await fetch(`${API}/api/users/me`, {
                method: "PATCH",
                headers: authHeaders(),
                body: JSON.stringify({
                    name: profile.name.trim(),
                    username: profile.username.trim(),
                    profileImage: profile.profileImage,
                }),
            });
            const data = await readJson(response);
            if (!response.ok || !data.user) throw new Error(data.message || "Could not save your profile.");
            applyUser(data.user);
            syncStoredUser(data.user);
            flash("success", "Profile saved.");
        } catch (error) {
            flash("error", error.message || "Could not save your profile.");
        } finally {
            setSavingProfile(false);
        }
    }

    // ---------- Password ----------
    function closePasswordForm() {
        setShowPasswordForm(false);
        setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    }

    async function savePassword() {
        if (user.hasPassword && !passwords.currentPassword) {
            flash("error", "Enter your current password.");
            return;
        }
        if (passwords.newPassword.length < 8) {
            flash("error", "New password must be at least 8 characters.");
            return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            flash("error", "New passwords don't match.");
            return;
        }

        setSavingPassword(true);
        try {
            const response = await fetch(`${API}/api/users/me/password`, {
                method: "PATCH",
                headers: authHeaders(),
                body: JSON.stringify({
                    currentPassword: passwords.currentPassword,
                    newPassword: passwords.newPassword,
                }),
            });
            const data = await readJson(response);
            if (!response.ok) throw new Error(data.message || "Could not change your password.");
            if (data.user) applyUser(data.user);
            closePasswordForm();
            flash("success", user.hasPassword ? "Password changed." : "Password set. You can now also sign in with email.");
        } catch (error) {
            flash("error", error.message || "Could not change your password.");
        } finally {
            setSavingPassword(false);
        }
    }

    // ---------- Notifications ----------
    const role = user?.role || "adopter";
    const emailKeys = ROLE_EMAILS[role] || ROLE_EMAILS.adopter;
    const prefsDirty = user && emailKeys.some(
        (key) => (prefs[key] !== false) !== (user.emailPrefs?.[key] !== false)
    );

    function togglePref(key) {
        setPrefs((current) => ({ ...current, [key]: current[key] === false }));
    }

    async function savePrefs() {
        setSavingPrefs(true);
        try {
            const emailPrefs = {};
            emailKeys.forEach((key) => { emailPrefs[key] = prefs[key] !== false; });
            const response = await fetch(`${API}/api/users/me/notifications`, {
                method: "PATCH",
                headers: authHeaders(),
                body: JSON.stringify({ emailPrefs }),
            });
            const data = await readJson(response);
            if (!response.ok) throw new Error(data.message || "Could not save your notification settings.");
            if (data.user) applyUser(data.user);
            flash("success", "Notification settings saved.");
        } catch (error) {
            flash("error", error.message || "Could not save your notification settings.");
        } finally {
            setSavingPrefs(false);
        }
    }

    // ---------- Render ----------
    const ready = !loading && !loadError && Boolean(user);
    const onOwnTab = !extraTabs.some((item) => item.key === tab);

    const photo = profile.profileImage;

    return (
        <div className="as2-page">
            <nav className="as2-nav" aria-label="Settings">
                {[...TABS, ...extraTabs].map((item) => (
                    <button
                        key={item.key}
                        type="button"
                        className={tab === item.key ? "is-active" : ""}
                        onClick={() => switchTab(item.key)}
                    >
                        {item.label}
                    </button>
                ))}
            </nav>

            <div className="as2-main">
                {notice && (
                    <div className={`as2-notice is-${notice.type}`} role="status">
                        <span>{notice.text}</span>
                        <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>×</button>
                    </div>
                )}

                {onOwnTab && loading && (
                    <div className="as2-card as2-state">Loading your account…</div>
                )}

                {onOwnTab && !loading && !ready && (
                    <div className="as2-card as2-state">
                        <p>{loadError || "Could not load your account."}</p>
                        <button type="button" className="as2-btn" onClick={() => { setLoading(true); setLoadError(""); loadMe(); }}>Try again</button>
                    </div>
                )}

                {extraTabs.map((item) => tab === item.key && (
                    <div className="as2-panel" key={item.key}>{item.content}</div>
                ))}

                {ready && tab === "profile" && (
                    <>
                        <section className="as2-card">
                            <header className="as2-card-head">
                                <h2>Profile</h2>
                            </header>

                            <div className="as2-photo-row">
                                <span className="as2-avatar">
                                    {photo ? <img src={photo} alt="" /> : initials(profile.name)}
                                </span>
                                <div className="as2-photo-actions">
                                    <label className={`as2-btn ${uploading ? "is-disabled" : ""}`}>
                                        {uploading ? "Uploading…" : "Change photo"}
                                        <input type="file" accept="image/*" hidden disabled={uploading} onChange={uploadPhoto} />
                                    </label>
                                    {photo && (
                                        <button
                                            type="button"
                                            className="as2-btn is-ghost"
                                            onClick={() => setProfile((current) => ({ ...current, profileImage: "" }))}
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <small>JPG or PNG, up to 5 MB.</small>
                                </div>
                            </div>

                            <div className="as2-fields">
                                <label className="as2-field">
                                    <span>Full name</span>
                                    <input
                                        value={profile.name}
                                        maxLength={80}
                                        onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))}
                                    />
                                </label>
                                <label className="as2-field">
                                    <span>Username</span>
                                    <input
                                        value={profile.username}
                                        maxLength={30}
                                        placeholder="e.g. juan.dc"
                                        onChange={(event) => setProfile((current) => ({ ...current, username: event.target.value }))}
                                    />
                                </label>
                                <label className="as2-field is-wide">
                                    <span>Email</span>
                                    <input value={user.email || ""} disabled />
                                    <small>Email can't be changed here.</small>
                                </label>
                            </div>
                        </section>

                        <div className="as2-actions">
                            <button
                                type="button"
                                className="as2-btn is-ghost"
                                disabled={!profileDirty || savingProfile}
                                onClick={() => applyUser(user)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="as2-btn is-primary"
                                disabled={!profileDirty || savingProfile || uploading}
                                onClick={saveProfile}
                            >
                                {savingProfile ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </>
                )}

                {ready && tab === "security" && (
                    <>
                        <section className="as2-card">
                            <header className="as2-card-head">
                                <h2>Account</h2>
                                <p>Your sign-in details and role.</p>
                            </header>

                            <div className="as2-row">
                                <div>
                                    <strong>Email</strong>
                                    <small>{maskEmail(user.email)}</small>
                                </div>
                            </div>

                            <div className="as2-row">
                                <div>
                                    <strong>Role</strong>
                                    <small>{ROLE_LABELS[role] || role}</small>
                                </div>
                                {role === "adopter" && onApplyRole && (
                                    <button type="button" className="as2-btn" onClick={onApplyRole}>Apply for a role</button>
                                )}
                            </div>

                            <div className="as2-row">
                                <div>
                                    <strong>Login verification</strong>
                                    <small>A one-time code is emailed to you when you sign in.</small>
                                </div>
                                <span className="as2-pill">Always on</span>
                            </div>
                        </section>

                        <section className="as2-card">
                            <header className="as2-card-head">
                                <h2>Password</h2>
                                <p>
                                    {user.hasPassword
                                        ? "Use at least 8 characters with upper and lower case, a number and a symbol."
                                        : "You signed in with Google. Set a password to also sign in with your email."}
                                </p>
                            </header>

                            {!showPasswordForm ? (
                                <div className="as2-row">
                                    <div>
                                        <strong>{user.hasPassword ? "Password" : "Signed in with Google"}</strong>
                                        <small>{user.hasPassword ? "••••••••" : "No password set"}</small>
                                    </div>
                                    <button type="button" className="as2-btn" onClick={() => setShowPasswordForm(true)}>
                                        {user.hasPassword ? "Change password" : "Set a password"}
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="as2-fields">
                                        {user.hasPassword && (
                                            <label className="as2-field is-wide">
                                                <span>Current password</span>
                                                <input
                                                    type="password"
                                                    autoComplete="current-password"
                                                    value={passwords.currentPassword}
                                                    onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))}
                                                />
                                            </label>
                                        )}
                                        <label className="as2-field">
                                            <span>New password</span>
                                            <input
                                                type="password"
                                                autoComplete="new-password"
                                                value={passwords.newPassword}
                                                onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))}
                                            />
                                        </label>
                                        <label className="as2-field">
                                            <span>Confirm new password</span>
                                            <input
                                                type="password"
                                                autoComplete="new-password"
                                                value={passwords.confirmPassword}
                                                onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))}
                                            />
                                        </label>
                                    </div>
                                    <div className="as2-actions is-inline">
                                        <button type="button" className="as2-btn is-ghost" disabled={savingPassword} onClick={closePasswordForm}>
                                            Cancel
                                        </button>
                                        <button type="button" className="as2-btn is-primary" disabled={savingPassword} onClick={savePassword}>
                                            {savingPassword ? "Saving…" : user.hasPassword ? "Update password" : "Set password"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </section>

                        <section className="as2-card">
                            <header className="as2-card-head">
                                <h2>Session</h2>
                            </header>
                            <div className="as2-row">
                                <div>
                                    <strong>This device</strong>
                                    <small>You're signed in here.</small>
                                </div>
                                {onLogout && (
                                    <button type="button" className="as2-btn is-danger" onClick={onLogout}>Log out</button>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {ready && tab === "notifications" && (
                    <>
                        <section className="as2-card">
                            <header className="as2-card-head">
                                <h2>Email notifications</h2>
                                <p>Choose which emails you get. & in app notifications still updates.</p>
                            </header>

                            {emailKeys.length === 0 && (
                                <div className="as2-row">
                                    <div>
                                        <strong>No optional emails</strong>
                                        <small>Your role only gets security emails.</small>
                                    </div>
                                </div>
                            )}

                            {emailKeys.map((key) => {
                                const on = prefs[key] !== false;
                                return (
                                    <div className="as2-row" key={key}>
                                        <div>
                                            <strong>{EMAIL_OPTIONS[key].label}</strong>
                                            <small>{EMAIL_OPTIONS[key].hint}</small>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={on}
                                            aria-label={EMAIL_OPTIONS[key].label}
                                            className={`as2-switch ${on ? "is-on" : ""}`}
                                            onClick={() => togglePref(key)}
                                        >
                                            <span />
                                        </button>
                                    </div>
                                );
                            })}
                        </section>

                        <section className="as2-card is-muted">
                            <header className="as2-card-head">
                                <h2>Always sent</h2>
                                <p>These keep your account safe, so they can't be turned off.</p>
                            </header>
                            <div className="as2-row">
                                <div>
                                    <strong>Login codes and password resets</strong>
                                    <small>Sent when you sign in or reset your password.</small>
                                </div>
                                <span className="as2-pill">Always on</span>
                            </div>
                            <div className="as2-row">
                                <div>
                                    <strong>Role application results</strong>
                                    <small>Sent when your role application is approved or declined.</small>
                                </div>
                                <span className="as2-pill">Always on</span>
                            </div>
                        </section>

                        {emailKeys.length > 0 && (
                            <div className="as2-actions">
                                <button
                                    type="button"
                                    className="as2-btn is-ghost"
                                    disabled={!prefsDirty || savingPrefs}
                                    onClick={() => setPrefs({ ...(user.emailPrefs || {}) })}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="as2-btn is-primary"
                                    disabled={!prefsDirty || savingPrefs}
                                    onClick={savePrefs}
                                >
                                    {savingPrefs ? "Saving…" : "Save changes"}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
