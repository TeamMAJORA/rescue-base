import {
    useEffect,
    useMemo,
    useState
} from "react";


// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

const API = import.meta.env.VITE_BACKEND_URL;

const initialAddForm = {
    username: "",
    email: "",
    password: "",
    role: "adopter",
};

const initialEditForm = {
    username: "",
    role: "adopter",
    status: "active",
    verified: false,
};

const roles = [
    { value: "admin", label: "Admin" },
    { value: "adopter", label: "Adopter" },
    { value: "foster", label: "Foster" },
    { value: "volunteer", label: "Volunteer" },
    { value: "staff", label: "Staff" },
];

export default function UserManagement() {
    const token = localStorage.getItem("token");
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState(initialAddForm);
    const [addingUser, setAddingUser] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState(initialEditForm);
    const [reviewingApplication, setReviewingApplication] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [reviewing, setReviewing] = useState(false);
    const totalUsers = users.length;

    const activeUsers = useMemo(() => {
        return users.filter(
            (user) => user.status !== "disabled"
        ).length;
    }, [users]);

    const fosterUsers = useMemo(() => {
        return users.filter(
            (user) => user.role === "foster"
        ).length;
    }, [users]);

    const pendingApplications = useMemo(() => {
        return users.filter(
            (user) =>
                user.roleApplication?.status === "pending"
        );
    }, [users]);

    async function fetchUsers() {
        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(`${API}/api/users`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message || "Failed to fetch users."
                );
                return;
            }

            setUsers(data.users || []);
        } catch (error) {
            console.error("Fetch users error:", error);
            setMessage(
                "Server error while fetching users."
            );
        } finally {
            setLoading(false);
        }
    }

    function handleAddFormChange(e) {
        const { name, value } = e.target;

        setAddForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function handleEditFormChange(e) {
        const { name, value } = e.target;

        setEditForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    }

    function handleVerifiedChange(e) {
        setEditForm((previous) => ({
            ...previous,
            verified: e.target.value === "true",
        }));
    }

    function handleEditUser(user) {
        setEditingUser(user);

        setEditForm({
            username: user.username || user.name || "",
            role: user.role || "adopter",
            status: user.status || "active",
            verified: Boolean(user.verified),
        });

        setShowAddForm(false);
        setMessage("");
    }

    async function handleDeactivateUser(user) {
        const confirmed = await askConfirm({ title: `Deactivate ${user.username || user.name || "this user"}?`, confirmLabel: "Deactivate", danger: true });

        if (!confirmed) return;

        try {
            setMessage("");

            const response = await fetch(
                `${API}/api/users/${user._id}/deactivate`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message || "Failed to deactivate user."
                );
                return;
            }

            setMessage("User deactivated successfully.");
            await fetchUsers();
        } catch (error) {
            console.error("Deactivate user error:", error);
            setMessage(
                "Server error while deactivating user."
            );
        }
    }

    function handleCancelEdit() {
        setEditingUser(null);
        setEditForm(initialEditForm);
        setMessage("");
    }

    function handleCancelAdd() {
        setShowAddForm(false);
        setAddForm(initialAddForm);
        setMessage("");
    }

    async function handleAddUser(e) {
        e.preventDefault();

        if (addingUser) return;

        try {
            setAddingUser(true);
            setMessage("");

            const response = await fetch(`${API}/api/users`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(addForm),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message || "Failed to create user."
                );
                return;
            }

            setMessage("User created successfully.");
            setAddForm(initialAddForm);
            setShowAddForm(false);

            await fetchUsers();
        } catch (error) {
            console.error("Add user error:", error);
            setMessage(
                "Server error while creating user."
            );
        } finally {
            setAddingUser(false);
        }
    }

    async function handleUpdateUser(e) {
        e.preventDefault();

        if (!editingUser) return;

        try {
            setMessage("");

            const response = await fetch(
                `${API}/api/users/${editingUser._id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(editForm),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message || "Failed to update user."
                );
                return;
            }

            setMessage("User updated successfully.");
            setEditingUser(null);
            setEditForm(initialEditForm);

            await fetchUsers();
        } catch (error) {
            console.error("Update user error:", error);
            setMessage(
                "Server error while updating user."
            );
        }
    }

    async function handleReviewApplication(decision) {
        if (!reviewingApplication || reviewing) return;

        if (
            decision === "rejected" &&
            !rejectionReason.trim()
        ) {
            setMessage("Please provide a rejection reason.");
            return;
        }

        const applicantName =
            reviewingApplication.username ||
            reviewingApplication.name ||
            "this user";

        const confirmed = await askConfirm({ title: `Are you sure you want to ${decision} ${applicantName}'s role application?`, confirmLabel: decision.charAt(0).toUpperCase() + decision.slice(1), danger: decision === "rejected" });

        if (!confirmed) return;

        try {
            setReviewing(true);
            setMessage("");

            const response = await fetch(
                `${API}/api/users/${reviewingApplication._id}/role-application`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        decision,
                        rejectionReason:
                            decision === "rejected"
                                ? rejectionReason.trim()
                                : "",
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to review role application."
                );
                return;
            }

            setMessage(
                decision === "approved"
                    ? "Role application approved successfully."
                    : "Role application rejected successfully."
            );

            setReviewingApplication(null);
            setRejectionReason("");

            await fetchUsers();
        } catch (error) {
            console.error("Review role application error:", error);

            setMessage(
                "Server error while reviewing role application."
            );
        } finally {
            setReviewing(false);
        }
    }

    async function handleReactivateUser(user) {
        const confirmed = await askConfirm({
            title: `Reactivate ${user.username || user.name || "this user"}?`,
            message: "They will be able to log in again.",
            confirmLabel: "Reactivate",
        });

        if (!confirmed) return;

        try {
            setMessage("");

            const response = await fetch(`${API}/api/users/${user._id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ status: "active" }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to reactivate user.");
                return;
            }

            setMessage("User reactivated.");
            await fetchUsers();
        } catch (error) {
            console.error("Reactivate user error:", error);
            setMessage("Server error while reactivating user.");
        }
    }

    useEffect(() => {
        fetchUsers();
    }, []);

    // ----- Search and filters -----
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const savedUser = (() => {
        try {
            return JSON.parse(localStorage.getItem("rescuebase_user") || "{}");
        } catch {
            return {};
        }
    })();
    const myEmail = String(savedUser.email || "").trim().toLowerCase();

    const deactivatedUsers = totalUsers - activeUsers;

    const roleCounts = users.reduce((counts, user) => {
        const role = user.role || "adopter";
        counts[role] = (counts[role] || 0) + 1;
        return counts;
    }, {});

    const visibleUsers = users.filter((user) => {
        const name = String(user.username || user.name || "").toLowerCase();
        const email = String(user.email || "").toLowerCase();
        const term = search.trim().toLowerCase();
        const isDisabled = user.status === "disabled";

        if (term && !name.includes(term) && !email.includes(term)) return false;
        if (roleFilter !== "all" && (user.role || "adopter") !== roleFilter) return false;
        if (statusFilter === "active" && isDisabled) return false;
        if (statusFilter === "disabled" && !isDisabled) return false;
        return true;
    });

    function initials(user) {
        return (
            String(user.username || user.name || user.email || "?")
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase() || "?"
        );
    }

    // Green for success, red for problems
    const messageTone = /success|created|updated|deactivated|reactivated|approved|rejected success/i.test(message)
        && !/fail|error|can't|cannot|only/i.test(message)
        ? "success"
        : "error";

    const roleLabel = (value) =>
        roles.find((role) => role.value === value)?.label || value || "Adopter";

    return (
        <section className="um-page">
            {/* Stats */}
            <div className="um-strip">
                <div className="um-strip-total">
                    <b>{totalUsers}</b>
                    <small>Total users</small>
                </div>
                <div>
                    <small>Active</small>
                    <b>{activeUsers}</b>
                </div>
                <div>
                    <small>Deactivated</small>
                    <b>{deactivatedUsers}</b>
                </div>
                <div>
                    <small>Adopters</small>
                    <b>{roleCounts.adopter || 0}</b>
                </div>
            </div>

            {message && !showAddForm && !editingUser && (
                <p className={`gs-alert ${messageTone} um-message`}>{message}</p>
            )}

            {/* Role applications */}
            <section className="gs-card um-apps">
                <div className="um-apps-head">
                    <div>
                        <h3>
                            <span className="gs-mark">Role applications</span>
                        </h3>
                        <p>Adopters asking to become volunteers or staff.</p>
                    </div>

                    <span className={`um-count ${pendingApplications.length ? "has" : ""}`}>
                        {pendingApplications.length
                            ? `${pendingApplications.length} pending`
                            : "No pending applications"}
                    </span>
                </div>

                {pendingApplications.map((user) => {
                    const isOpen = reviewingApplication?._id === user._id;

                    return (
                        <article className="um-app" key={user._id}>
                            <div className="um-who">
                                <span className="um-avatar">{initials(user)}</span>
                                <div>
                                    <b>{user.username || user.name || "Unnamed user"}</b>
                                    <span>
                                        {user.email} · wants to be{" "}
                                        <strong>{roleLabel(user.roleApplication?.targetRole)}</strong>
                                    </span>
                                    <p>{user.roleApplication?.reason || "No reason given."}</p>
                                </div>
                            </div>

                            {isOpen ? (
                                <div className="um-app-review">
                                    <label className="afr-reason">
                                        <span>
                                            Reason for rejection <em>(only needed to reject)</em>
                                        </span>
                                        <textarea
                                            rows="2"
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                        />
                                    </label>

                                    <div className="um-actions">
                                        <button
                                            type="button"
                                            className="gs-btn ghost"
                                            onClick={() => {
                                                setReviewingApplication(null);
                                                setRejectionReason("");
                                            }}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            className="gs-btn um-danger"
                                            disabled={reviewing}
                                            onClick={() => handleReviewApplication("rejected")}
                                        >
                                            Reject
                                        </button>
                                        <button
                                            type="button"
                                            className="gs-btn primary"
                                            disabled={reviewing}
                                            onClick={() => handleReviewApplication("approved")}
                                        >
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="um-actions">
                                    <button
                                        type="button"
                                        className="gs-btn primary"
                                        onClick={() => {
                                            setReviewingApplication(user);
                                            setRejectionReason("");
                                        }}
                                    >
                                        Review
                                    </button>
                                </div>
                            )}
                        </article>
                    );
                })}
            </section>

            {/* All users */}
            <section className="gs-card">
                <div className="um-list-head">
                    <h3>
                        <span className="gs-mark">All users</span>
                    </h3>

                    <button
                        type="button"
                        className="gs-btn primary"
                        onClick={() => {
                            setShowAddForm(true);
                            setEditingUser(null);
                            setMessage("");
                        }}
                    >
                        + Add user
                    </button>
                </div>

                <div className="um-tools">
                    <input
                        type="search"
                        className="um-search"
                        placeholder="Search name or email"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />

                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Role">
                        <option value="all">All roles</option>
                        {roles.map((role) => (
                            <option key={role.value} value={role.value}>
                                {role.label}
                            </option>
                        ))}
                    </select>

                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Status">
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="disabled">Deactivated</option>
                    </select>
                </div>

                <p className="um-shown">
                    Showing {visibleUsers.length} of {totalUsers} users
                </p>

                {loading ? (
                    <p className="rp-empty">
                        <span className="ao-spinner" /> Loading users...
                    </p>
                ) : visibleUsers.length === 0 ? (
                    <p className="rp-empty">No users match your search.</p>
                ) : (
                    <div className="um-table-wrap">
                        <table className="um-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Email status</th>
                                    <th className="um-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleUsers.map((user) => {
                                    const isDisabled = user.status === "disabled";
                                    const isMe = myEmail && String(user.email || "").toLowerCase() === myEmail;

                                    return (
                                        <tr key={user._id} className={isDisabled ? "is-off" : ""}>
                                            <td>
                                                <div className="um-who">
                                                    <span className="um-avatar">{initials(user)}</span>
                                                    <div>
                                                        <b>
                                                            {user.username || user.name || "Unnamed user"}
                                                            {isMe && <span className="um-you">You</span>}
                                                        </b>
                                                        <span>{user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`um-role r-${user.role || "adopter"}`}>
                                                    {roleLabel(user.role)}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`um-status ${isDisabled ? "off" : user.status === "pending" ? "pending" : "on"}`}>
                                                    <i />
                                                    {isDisabled ? "Deactivated" : user.status === "pending" ? "Pending" : "Active"}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={user.verified ? "um-verified" : "um-unverified"}>
                                                    {user.verified ? "Verified" : "Not verified"}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="um-actions um-right">
                                                    <button type="button" className="gs-btn ghost" onClick={() => handleEditUser(user)}>
                                                        Edit
                                                    </button>

                                                    {!isMe && (isDisabled ? (
                                                        <button type="button" className="gs-btn um-ok" onClick={() => handleReactivateUser(user)}>
                                                            Reactivate
                                                        </button>
                                                    ) : (
                                                        <button type="button" className="gs-btn um-danger" onClick={() => handleDeactivateUser(user)}>
                                                            Deactivate
                                                        </button>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* Add user pop-up */}
            {showAddForm && (
                <div className="ao-confirm-backdrop" onClick={handleCancelAdd}>
                    <form className="um-modal" onSubmit={handleAddUser} onClick={(e) => e.stopPropagation()}>
                        <h3>
                            <span className="gs-mark">Add user</span>
                        </h3>

                        <label className="gs-field">
                            Username
                            <input name="username" value={addForm.username} onChange={handleAddFormChange} required />
                        </label>

                        <label className="gs-field">
                            Email
                            <input type="email" name="email" value={addForm.email} onChange={handleAddFormChange} required />
                        </label>

                        <label className="gs-field">
                            Password
                            <input type="password" name="password" value={addForm.password} onChange={handleAddFormChange} required />
                        </label>

                        <label className="gs-field">
                            Role
                            <select name="role" value={addForm.role} onChange={handleAddFormChange}>
                                {roles.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {message && <p className={`gs-alert ${messageTone}`}>{message}</p>}

                        <div className="um-actions um-right">
                            <button type="button" className="gs-btn ghost" onClick={handleCancelAdd}>
                                Cancel
                            </button>
                            <button type="submit" className="gs-btn primary" disabled={addingUser}>
                                {addingUser ? "Adding..." : "Add user"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit user pop-up */}
            {editingUser && (
                <div className="ao-confirm-backdrop" onClick={handleCancelEdit}>
                    <form className="um-modal" onSubmit={handleUpdateUser} onClick={(e) => e.stopPropagation()}>
                        <h3>
                            <span className="gs-mark">Edit user</span>
                        </h3>
                        <p className="um-modal-sub">{editingUser.email}</p>

                        <label className="gs-field">
                            Username
                            <input name="username" value={editForm.username} onChange={handleEditFormChange} required />
                        </label>

                        <label className="gs-field">
                            Role
                            <select name="role" value={editForm.role} onChange={handleEditFormChange}>
                                {roles.map((role) => (
                                    <option key={role.value} value={role.value}>
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="gs-field">
                            Status
                            <select name="status" value={editForm.status} onChange={handleEditFormChange}>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="disabled">Deactivated</option>
                            </select>
                        </label>

                        <label className="gs-field">
                            Email verified
                            <select value={String(editForm.verified)} onChange={handleVerifiedChange}>
                                <option value="true">Verified</option>
                                <option value="false">Not verified</option>
                            </select>
                        </label>

                        {message && <p className={`gs-alert ${messageTone}`}>{message}</p>}

                        <div className="um-actions um-right">
                            <button type="button" className="gs-btn ghost" onClick={handleCancelEdit}>
                                Cancel
                            </button>
                            <button type="submit" className="gs-btn primary">
                                Save changes
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}
