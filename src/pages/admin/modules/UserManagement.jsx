import {
    useEffect,
    useMemo,
    useState
} from "react";

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
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const token = localStorage.getItem("token");

    const [showAddForm, setShowAddForm] = useState(false);
    const [addForm, setAddForm] = useState(initialAddForm);
    const [addingUser, setAddingUser] = useState(false);

    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState(initialEditForm);

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
        const confirmed = window.confirm(
            `Are you sure you want to deactivate ${user.username || user.name || "this user"}?`
        );

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

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <section className="admin-user-page">
            <div className="admin-user-stats">
                <article className="admin-stat-card">
                    <span>Total Users</span>
                    <strong>{totalUsers}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Active Users</span>
                    <strong>{activeUsers}</strong>
                </article>

                <article className="admin-stat-card">
                    <span>Foster Users</span>
                    <strong>{fosterUsers}</strong>
                </article>
            </div>

            <section className="admin-panel admin-user-panel">
                <div className="admin-panel-heading">
                    <div>
                        <h2>User Management</h2>
                        <p>
                            Manage user roles, account status,
                            and verification.
                        </p>
                    </div>

                    <div className="admin-user-header-actions">
                        <button
                            type="button"
                            onClick={() => {
                                setShowAddForm(true);
                                setEditingUser(null);
                                setMessage("");
                            }}
                        >
                            Add User
                        </button>

                        <button
                            type="button"
                            onClick={fetchUsers}
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                {message && (
                    <p className="admin-user-message">
                        {message}
                    </p>
                )}

                {showAddForm && (
                    <form
                        className="admin-user-edit-form"
                        onSubmit={handleAddUser}
                    >
                        <h3>Add User</h3>

                        <label>
                            Username
                            <input
                                type="text"
                                name="username"
                                value={addForm.username}
                                onChange={handleAddFormChange}
                                placeholder="Enter username"
                                required
                            />
                        </label>

                        <label>
                            Email
                            <input
                                type="email"
                                name="email"
                                value={addForm.email}
                                onChange={handleAddFormChange}
                                placeholder="Enter email"
                                required
                            />
                        </label>

                        <label>
                            Password
                            <input
                                type="password"
                                name="password"
                                value={addForm.password}
                                onChange={handleAddFormChange}
                                placeholder="Minimum 6 characters"
                                minLength={6}
                                required
                            />
                        </label>

                        <label>
                            Role
                            <select
                                name="role"
                                value={addForm.role}
                                onChange={handleAddFormChange}
                            >
                                {roles.map((role) => (
                                    <option
                                        key={role.value}
                                        value={role.value}
                                    >
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <div className="admin-user-form-actions">
                            <button
                                type="submit"
                                disabled={addingUser}
                            >
                                {addingUser
                                    ? "Creating..."
                                    : "Create User"}
                            </button>

                            <button
                                type="button"
                                onClick={handleCancelAdd}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {editingUser && (
                    <form
                        className="admin-user-edit-form"
                        onSubmit={handleUpdateUser}
                    >
                        <h3>Edit User</h3>

                        <label>
                            Username
                            <input
                                type="text"
                                name="username"
                                value={editForm.username}
                                onChange={handleEditFormChange}
                                required
                            />
                        </label>

                        <label>
                            Role
                            <select
                                name="role"
                                value={editForm.role}
                                onChange={handleEditFormChange}
                            >
                                {roles.map((role) => (
                                    <option
                                        key={role.value}
                                        value={role.value}
                                    >
                                        {role.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Status
                            <select
                                name="status"
                                value={editForm.status}
                                onChange={handleEditFormChange}
                            >
                                <option value="active">
                                    Active
                                </option>

                                <option value="pending">
                                    Pending
                                </option>

                                <option value="disabled">
                                    Disabled
                                </option>
                            </select>
                        </label>

                        <label>
                            Verified
                            <select
                                value={
                                    editForm.verified
                                        ? "true"
                                        : "false"
                                }
                                onChange={handleVerifiedChange}
                            >
                                <option value="true">
                                    Verified
                                </option>

                                <option value="false">
                                    Not Verified
                                </option>
                            </select>
                        </label>

                        <div className="admin-user-form-actions">
                            <button type="submit">
                                Save Changes
                            </button>

                            <button
                                type="button"
                                onClick={handleCancelEdit}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <p className="admin-empty">
                        Loading users...
                    </p>
                ) : users.length === 0 ? (
                    <p className="admin-empty">
                        No users found.
                    </p>
                ) : (
                    <div className="admin-user-list">
                        {users.map((user) => (
                            <article
                                className="admin-user-row"
                                key={user._id}
                            >
                                <div>
                                    <h3>
                                        {user.username ||
                                            user.name ||
                                            "Unnamed User"}
                                    </h3>

                                    <p>{user.email}</p>

                                    <small>
                                        ID: {user._id}
                                    </small>
                                </div>

                                <div className="admin-user-badges">
                                    <span>
                                        {user.role || "adopter"}
                                    </span>

                                    <span>
                                        {user.status || "active"}
                                    </span>

                                    <span>
                                        {user.verified
                                            ? "Verified"
                                            : "Not Verified"}
                                    </span>
                                </div>

                                <div className="admin-user-row-actions">
                                    <button
                                        type="button"
                                        className="admin-user-action-btn deactivate-btn"
                                        onClick={() => handleDeactivateUser(user)}
                                        disabled={user.status === "disabled"}
                                    >
                                        {user.status === "disabled"
                                            ? "Deactivated"
                                            : "Deactivate"}
                                    </button>

                                    <button
                                        type="button"
                                        className="admin-user-action-btn edit-btn"
                                        onClick={() => handleEditUser(user)}
                                    >
                                        Edit
                                    </button>
                                </div>

                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}