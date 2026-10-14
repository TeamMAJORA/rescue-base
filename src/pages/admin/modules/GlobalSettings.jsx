
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

function SettingToggle({ label, description, checked, onChange }) {
    return (
        <label className="global-setting-toggle">
            <span>
                <strong>{label}</strong>
                {description && <small>{description}</small>}
            </span>

            <input
                type="checkbox"
                checked={checked}
                onChange={(event) => onChange(event.target.checked)}
            />
        </label>
    );
}

export default function GlobalSettings() {
    const [settings, setSettings] = useState(() =>
        mergeSettings(DEFAULT_SETTINGS)
    );
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const loadSettings = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const data = await requestSettings();
            setSettings(mergeSettings(data.settings));
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

    async function handleSave(event) {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const data = await requestSettings("PATCH", settings);

            setSettings(mergeSettings(data.settings));
            setSuccess(data.message || "Global settings saved successfully.");
        } catch (err) {
            console.error("Save global settings error:", err);
            setError(err.message || "Failed to save settings.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <section className="admin-panel">
                <p className="admin-empty">Loading global settings...</p>
            </section>
        );
    }

    return (
        <section className="admin-global-settings-page">
            <section className="admin-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>Global Settings</h2>
                        <p>
                            Configure application-wide preferences,
                            security policies, notifications, and maintenance.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={loadSettings}
                        disabled={saving}
                    >
                        Reload
                    </button>
                </div>

                {error && (
                    <p className="admin-reports-error" role="alert">
                        {error}
                    </p>
                )}

                {success && (
                    <p role="status" aria-live="polite">
                        {success}
                    </p>
                )}

                <form
                    className="admin-global-settings-form"
                    onSubmit={handleSave}
                >
                    {/* General */}
                    <section className="global-settings-section">
                        <div className="admin-panel-heading">
                            <div>
                                <h3>General Settings</h3>
                                <p>Application identity and contact details.</p>
                            </div>
                        </div>

                        <label>
                            Application name
                            <input
                                type="text"
                                value={settings.general.appName}
                                maxLength={100}
                                required
                                onChange={(event) =>
                                    updateSetting(
                                        "general",
                                        "appName",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Contact email
                            <input
                                type="email"
                                value={settings.general.contactEmail}
                                maxLength={254}
                                onChange={(event) =>
                                    updateSetting(
                                        "general",
                                        "contactEmail",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Contact phone
                            <input
                                type="tel"
                                value={settings.general.contactPhone}
                                maxLength={30}
                                onChange={(event) =>
                                    updateSetting(
                                        "general",
                                        "contactPhone",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label>
                            Timezone
                            <select
                                value={settings.general.timezone}
                                onChange={(event) =>
                                    updateSetting(
                                        "general",
                                        "timezone",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="Asia/Manila">
                                    Asia/Manila (Philippines)
                                </option>
                                <option value="UTC">UTC</option>
                                <option value="Asia/Tokyo">
                                    Asia/Tokyo
                                </option>
                                <option value="America/New_York">
                                    America/New_York
                                </option>
                                <option value="Europe/London">
                                    Europe/London
                                </option>
                            </select>
                        </label>
                    </section>

                    {/* Security */}
                    <section className="global-settings-section">
                        <div className="admin-panel-heading">
                            <div>
                                <h3>Security Settings</h3>
                                <p>
                                    Configure the intended authentication
                                    policy for the application.
                                </p>
                            </div>
                        </div>

                        <label>
                            Maximum login attempts
                            <input
                                type="number"
                                min={1}
                                max={20}
                                step={1}
                                required
                                value={settings.security.maxLoginAttempts}
                                onChange={(event) =>
                                    updateSetting(
                                        "security",
                                        "maxLoginAttempts",
                                        event.target.value === ""
                                            ? ""
                                            : Number(event.target.value)
                                    )
                                }
                            />
                        </label>

                        <label>
                            Lockout duration (minutes)
                            <input
                                type="number"
                                min={1}
                                max={1440}
                                step={1}
                                required
                                value={settings.security.lockoutMinutes}
                                onChange={(event) =>
                                    updateSetting(
                                        "security",
                                        "lockoutMinutes",
                                        event.target.value === ""
                                            ? ""
                                            : Number(event.target.value)
                                    )
                                }
                            />
                        </label>

                        <label>
                            Session timeout (minutes)
                            <input
                                type="number"
                                min={5}
                                max={10080}
                                step={1}
                                required
                                value={
                                    settings.security.sessionTimeoutMinutes
                                }
                                onChange={(event) =>
                                    updateSetting(
                                        "security",
                                        "sessionTimeoutMinutes",
                                        event.target.value === ""
                                            ? ""
                                            : Number(event.target.value)
                                    )
                                }
                            />
                        </label>

                        <SettingToggle
                            label="Require strong passwords"
                            description="Intended to require stronger passwords in registration and password-change flows."
                            checked={
                                settings.security.requireStrongPasswords
                            }
                            onChange={(value) =>
                                updateSetting(
                                    "security",
                                    "requireStrongPasswords",
                                    value
                                )
                            }
                        />

                        <p className="global-settings-note">
                            These values are stored as configuration.
                            Your login, session, and password-validation
                            code must enforce them separately.
                        </p>
                    </section>

                    {/* Notifications */}
                    <section className="global-settings-section">
                        <div className="admin-panel-heading">
                            <div>
                                <h3>Notification Settings</h3>
                                <p>
                                    Configure global notification preferences.
                                </p>
                            </div>
                        </div>

                        <SettingToggle
                            label="Email notifications"
                            description="Enable or disable the global email notification preference."
                            checked={settings.notifications.emailEnabled}
                            onChange={(value) =>
                                updateSetting(
                                    "notifications",
                                    "emailEnabled",
                                    value
                                )
                            }
                        />

                        <SettingToggle
                            label="Adoption updates"
                            checked={settings.notifications.adoptionUpdates}
                            onChange={(value) =>
                                updateSetting(
                                    "notifications",
                                    "adoptionUpdates",
                                    value
                                )
                            }
                        />

                        <SettingToggle
                            label="Medical alerts"
                            checked={settings.notifications.medicalAlerts}
                            onChange={(value) =>
                                updateSetting(
                                    "notifications",
                                    "medicalAlerts",
                                    value
                                )
                            }
                        />

                        <SettingToggle
                            label="Foster updates"
                            checked={settings.notifications.fosterUpdates}
                            onChange={(value) =>
                                updateSetting(
                                    "notifications",
                                    "fosterUpdates",
                                    value
                                )
                            }
                        />

                        <SettingToggle
                            label="Lost and found alerts"
                            checked={settings.notifications.lostFoundAlerts}
                            onChange={(value) =>
                                updateSetting(
                                    "notifications",
                                    "lostFoundAlerts",
                                    value
                                )
                            }
                        />

                        <SettingToggle
                            label="System alerts"
                            checked={settings.notifications.systemAlerts}
                            onChange={(value) =>
                                updateSetting(
                                    "notifications",
                                    "systemAlerts",
                                    value
                                )
                            }
                        />
                    </section>

                    {/* Maintenance */}
                    <section className="global-settings-section">
                        <div className="admin-panel-heading">
                            <div>
                                <h3>Maintenance Settings</h3>
                                <p>
                                    Configure maintenance mode and its notice.
                                </p>
                            </div>
                        </div>

                        <SettingToggle
                            label="Maintenance mode"
                            description="Store whether maintenance mode should be enabled."
                            checked={settings.maintenance.enabled}
                            onChange={(value) =>
                                updateSetting(
                                    "maintenance",
                                    "enabled",
                                    value
                                )
                            }
                        />

                        <label>
                            Maintenance message
                            <textarea
                                rows={4}
                                maxLength={500}
                                value={settings.maintenance.message}
                                onChange={(event) =>
                                    updateSetting(
                                        "maintenance",
                                        "message",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <SettingToggle
                            label="Allow administrator access"
                            description="Configuration for allowing administrators through maintenance restrictions."
                            checked={
                                settings.maintenance.allowAdminAccess
                            }
                            onChange={(value) =>
                                updateSetting(
                                    "maintenance",
                                    "allowAdminAccess",
                                    value
                                )
                            }
                        />

                        <p className="global-settings-note">
                            Saving maintenance settings does not, by itself,
                            block API requests or display a maintenance page.
                            That behavior must be connected to backend
                            middleware and frontend routing.
                        </p>
                    </section>

                    <div className="global-settings-actions">
                        <button type="submit" disabled={saving}>
                            {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </form>
            </section>
        </section>
    );
}
