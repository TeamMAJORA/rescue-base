
import { useCallback, useEffect, useState } from "react";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");

const DEFAULT_SETTINGS = {
    general: {
        appName: "RESCUEBASE",
        contactEmail: "",
        contactPhone: "",
        timezone: "Asia/Manila",
    },
    security: {
        maxLoginAttempts: 5,
        lockoutMinutes: 15,
        sessionTimeoutMinutes: 60,
        requireStrongPasswords: true,
    },
    notifications: {
        emailEnabled: true,
        adoptionUpdates: true,
        medicalAlerts: true,
        fosterUpdates: true,
        lostFoundAlerts: true,
        systemAlerts: true,
    },
    maintenance: {
        enabled: false,
        message:
            "RESCUEBASE is temporarily undergoing maintenance. Please try again later.",
        allowAdminAccess: true,
    },
};

async function requestSettings(method = "GET", body) {
    const token = localStorage.getItem("token");

    const response = await fetch(`${API}/api/settings`, {
        method,
        headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.success === false) {
        throw new Error(
            data.message || `Request failed (${response.status}).`
        );
    }

    return data;
}

function mergeSettings(settings) {
    return {
        general: {
            ...DEFAULT_SETTINGS.general,
            ...(settings?.general || {}),
        },
        security: {
            ...DEFAULT_SETTINGS.security,
            ...(settings?.security || {}),
        },
        notifications: {
            ...DEFAULT_SETTINGS.notifications,
            ...(settings?.notifications || {}),
        },
        maintenance: {
            ...DEFAULT_SETTINGS.maintenance,
            ...(settings?.maintenance || {}),
        },
    };
}

// Small icons for the card headers
const GS_ICONS = {
    warn: (
        <>
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </>
    ),
};

function GsIcon({ name, size = 18 }) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {GS_ICONS[name]}
        </svg>
    );
}

function CardHead({ title, text, tag }) {
    return (
        <div className="gs-head">
            <div>
                <h3>
                    <span className="gs-mark">{title}</span>
                    {tag}
                </h3>
                <p>{text}</p>
            </div>
        </div>
    );
}

// On/off switch row
function SettingToggle({ label, description, checked, onChange, disabled = false }) {
    return (
        <div className={`gs-row ${disabled ? "is-disabled" : ""}`}>
            <div>
                <b>{label}</b>
                {description && <small>{description}</small>}
            </div>

            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={label}
                className={`gs-switch ${checked ? "on" : ""}`}
                disabled={disabled}
                onClick={() => onChange(!checked)}
            />
        </div>
    );
}

// Number field with its unit shown inside (tries, min)
function NumberField({ label, unit, hint, value, min, max, onChange }) {
    return (
        <label className="gs-field">
            {label}
            <span className="gs-unit">
                <input
                    type="number"
                    min={min}
                    max={max}
                    step={1}
                    required
                    value={value}
                    onChange={(event) =>
                        onChange(event.target.value === "" ? "" : Number(event.target.value))
                    }
                />
                <i>{unit}</i>
            </span>
            {hint && <small>{hint}</small>}
        </label>
    );
}

function formatSavedAt(value) {
    if (!value) return "";

    return new Date(value).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
}

export default function GlobalSettings() {
    const [settings, setSettings] = useState(() =>
        mergeSettings(DEFAULT_SETTINGS)
    );
    // Last saved copy: used for "unsaved changes" and Discard
    const [savedSettings, setSavedSettings] = useState(() =>
        mergeSettings(DEFAULT_SETTINGS)
    );
    const [savedAt, setSavedAt] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const data = await requestSettings();
            const merged = mergeSettings(data.settings);

            setSettings(merged);
            setSavedSettings(merged);
            setSavedAt(data.settings?.updatedAt || "");
        } catch (err) {
            console.error("Load global settings error:", err);
            setError(err.message || "Failed to load settings.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

    function updateSetting(category, field, value) {
        setSettings((current) => ({
            ...current,
            [category]: {
                ...current[category],
                [field]: value,
            },
        }));

        setSuccess("");
    }

    function handleDiscard() {
        setSettings(savedSettings);
        setError("");
    }

    async function handleSave(event) {
        event.preventDefault();

        // Turning maintenance on closes RescueBase for users: ask first
        if (settings.maintenance.enabled && !savedSettings.maintenance.enabled) {
            const ok = window.rbConfirm
                ? await window.rbConfirm({
                    title: "Turn on maintenance mode?",
                    message: settings.maintenance.allowAdminAccess
                        ? "Everyone except admins will see the maintenance message instead of their dashboard."
                        : "Everyone, including admins, will be blocked. Only this Global Settings page keeps working.",
                    confirmLabel: "Turn on",
                    danger: true,
                })
                : window.confirm("Turn on maintenance mode?");

            if (!ok) return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const data = await requestSettings("PATCH", settings);
            const merged = mergeSettings(data.settings);

            setSettings(merged);
            setSavedSettings(merged);
            setSavedAt(data.settings?.updatedAt || new Date().toISOString());

            const text = data.message || "Global settings saved.";
            if (window.rbToast) window.rbToast(text);
            else setSuccess(text);
        } catch (err) {
            console.error("Save global settings error:", err);
            setError(err.message || "Failed to save settings.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <section className="gs-page">
                <div className="gs-card gs-loading">
                    <span className="ao-spinner" />
                    Loading global settings...
                </div>
            </section>
        );
    }

    const { general, security, notifications, maintenance } = settings;

    return (
        <form className="gs-page" onSubmit={handleSave}>
            <header className="gs-card gs-top">
                <div>
                    <h2>System settings</h2>
                    <p>
                        Applies to every account.
                        {savedAt ? ` Last saved ${formatSavedAt(savedAt)}.` : ""}
                    </p>
                </div>

                <button
                    type="button"
                    className="gs-btn ghost"
                    onClick={loadSettings}
                    disabled={saving}
                >
                    Reload
                </button>
            </header>

            {error && (
                <p className="gs-alert error" role="alert">
                    {error}
                </p>
            )}

            {success && (
                <p className="gs-alert success" role="status" aria-live="polite">
                    {success}
                </p>
            )}

            <div className="gs-grid">
                {/* General */}
                <section className="gs-card">
                    <CardHead title="General" text="Name and contact details shown to users." />

                    <div className="gs-fields">
                        <label className="gs-field">
                            Application name
                            <input
                                type="text"
                                value={general.appName}
                                maxLength={100}
                                required
                                onChange={(event) => updateSetting("general", "appName", event.target.value)}
                            />
                        </label>

                        <label className="gs-field">
                            Timezone
                            <select
                                value={general.timezone}
                                onChange={(event) => updateSetting("general", "timezone", event.target.value)}
                            >
                                <option value="Asia/Manila">Asia/Manila (Philippines)</option>
                                <option value="UTC">UTC</option>
                                <option value="Asia/Tokyo">Asia/Tokyo</option>
                                <option value="America/New_York">America/New_York</option>
                                <option value="Europe/London">Europe/London</option>
                            </select>
                        </label>

                        <label className="gs-field">
                            Contact email
                            <input
                                type="email"
                                value={general.contactEmail}
                                maxLength={254}
                                placeholder="shelter@example.com"
                                onChange={(event) => updateSetting("general", "contactEmail", event.target.value)}
                            />
                        </label>

                        <label className="gs-field">
                            Contact phone
                            <input
                                type="tel"
                                value={general.contactPhone}
                                maxLength={30}
                                placeholder="+63 9XX XXX XXXX"
                                onChange={(event) => updateSetting("general", "contactPhone", event.target.value)}
                            />
                        </label>
                    </div>
                </section>

                {/* Security */}
                <section className="gs-card">
                    <CardHead title="Security" text="Login limits and how long a session lasts." />

                    <div className="gs-fields">
                        <NumberField
                            label="Max login attempts"
                            unit="tries"
                            min={1}
                            max={20}
                            value={security.maxLoginAttempts}
                            onChange={(value) => updateSetting("security", "maxLoginAttempts", value)}
                        />

                        <NumberField
                            label="Lockout duration"
                            unit="min"
                            min={1}
                            max={1440}
                            value={security.lockoutMinutes}
                            onChange={(value) => updateSetting("security", "lockoutMinutes", value)}
                        />

                        <NumberField
                            label="Session timeout"
                            unit="min"
                            hint="5 to 120 minutes (a login lasts 2 hours at most)."
                            min={5}
                            max={120}
                            value={security.sessionTimeoutMinutes}
                            onChange={(value) => updateSetting("security", "sessionTimeoutMinutes", value)}
                        />
                    </div>

                    <div className="gs-rows">
                        <SettingToggle
                            label="Require strong passwords"
                            description="8+ characters with uppercase, lowercase, a number and a symbol. Off: at least 6 characters."
                            checked={security.requireStrongPasswords}
                            onChange={(value) => updateSetting("security", "requireStrongPasswords", value)}
                        />
                    </div>
                </section>

                {/* Notifications */}
                <section className="gs-card">
                    <CardHead title="Notifications" text="Which emails RescueBase sends." />

                    <div className="gs-rows">
                        <SettingToggle
                            label="Email notifications"
                            description="Turns all emails on or off."
                            checked={notifications.emailEnabled}
                            onChange={(value) => updateSetting("notifications", "emailEnabled", value)}
                        />

                        <div className="gs-sub">
                            {[
                                ["adoptionUpdates", "Adoption updates"],
                                ["medicalAlerts", "Medical alerts"],
                                ["fosterUpdates", "Foster updates"],
                                ["lostFoundAlerts", "Lost and found alerts"],
                                ["systemAlerts", "System alerts"],
                            ].map(([field, label]) => (
                                <SettingToggle
                                    key={field}
                                    label={label}
                                    checked={notifications[field]}
                                    disabled={!notifications.emailEnabled}
                                    onChange={(value) => updateSetting("notifications", field, value)}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Maintenance */}
                <section className="gs-card">
                    <CardHead
                        title="Maintenance"
                        text="Temporarily close RescueBase to users."
                        tag={
                            <span className={`gs-pill ${savedSettings.maintenance.enabled ? "on" : ""}`}>
                                {savedSettings.maintenance.enabled ? "On" : "Off"}
                            </span>
                        }
                    />

                    <div className="gs-rows">
                        <SettingToggle
                            label="Maintenance mode"
                            description="Users see the message below instead of their dashboard."
                            checked={maintenance.enabled}
                            onChange={(value) => updateSetting("maintenance", "enabled", value)}
                        />

                        <SettingToggle
                            label="Let admins in"
                            description="Admins can keep working while it's on. If off, only this page keeps working."
                            checked={maintenance.allowAdminAccess}
                            onChange={(value) => updateSetting("maintenance", "allowAdminAccess", value)}
                        />
                    </div>

                    <label className="gs-field gs-message">
                        Message shown to users
                        <textarea
                            rows={3}
                            maxLength={500}
                            value={maintenance.message}
                            onChange={(event) => updateSetting("maintenance", "message", event.target.value)}
                        />
                        <small>{String(maintenance.message || "").length} / 500</small>
                    </label>

                    <p className="gs-warn">
                        <GsIcon name="warn" size={16} />
                        Turning this on signs everyone except admins out of their dashboard right away.
                    </p>
                </section>
            </div>

            {isDirty && (
                <div className="gs-savebar">
                    <span>You have unsaved changes</span>

                    <span className="gs-savebar-actions">
                        <button type="button" className="gs-btn ghost" onClick={handleDiscard} disabled={saving}>
                            Discard
                        </button>
                        <button type="submit" className="gs-btn primary" disabled={saving}>
                            {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </span>
                </div>
            )}
        </form>
    );
}
