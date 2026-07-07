import {
    useEffect, useMemo, useState
} from "react";

const API = import.meta.env.VITE_BACKEND_URL;

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");

    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState({
        username : "",
        role : "adopter",
        status : "active",
        verified : false,
    });

    const totalUsers = users.length;

    const activeUsers = useMemo(() => {
        return users.filter((user) => user.status !== "disabled").length;
    }, [users]);

    const fosterUsers = useMemo(() => {
        return users.filter((user) => user.role === "foster").length;
    });

    async function fetchUsers() {
        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(`${API}/api/users`);
            const data = await response.json();

            console.log("Users:", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to fetch users.");
                return;
            }
            
            setUsers(data.users || []);
        } catch (error) {
            console.error("Fetch users error :", error);
            setMessage("Server error while fetching users.");
        } finally {
            setLoading(false);
        }
    }

    function handleEditUser(user) {
        setEditForm(user);

        setEditForm({
            username : user.username || user.name || "",
            role : user.role || "adopter",
            status : user.status || "active",
            verified : Boolean(user.verified),
        });

        setMessage("");
    }

    function handleCancelEdit() {
        setEditingUser(null);
        setEditForm({
            username : "",
            role : "adopter",
            status : "active",
            verified : false,
        });
        setMessage("");
    }
    
    async function handleUpdateUser(e) {
        e.preventDefault();

        if(!editingUser) return;

        try {
            setMessage("");

            const savedUser = JSON.parse(
                localStorage.getItem("rescuebase_server") || "{}"
            );

            const response = await fetch(`${API}/api/users/${editingUser._id}`, {
                method : "PATCH",
                headers : {
                    "Content-Type" : "application/json",
                },
                body : JSON.stringify({
                    ...editForm,
                    adminName : savedUser.name || savedUser.username || "Admin User",
                    adminEmail : savedUser.email || "admin",
                }),
            });

            const data = await response.json();
            console.log("Update user : ", data);

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to update user.");
                return;
            }

            setMessage("User updated successfully.");
            setEditingUser(null);
            fetchUsers();
        } catch (error) {
            console.error("Update user error :", error);
            setMessage("Server error while updating user.");
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
                        <p>Manage user roles, account status, and verification.</p>
                    </div>

                    <button type="button" onClick={fetchUsers}>
                        Refresh
                    </button>
                </div>

                {message && <p className="admin-user-message">{message}</p>}

                {editingUser && (
                    <form className="admin-user-edit-form" onSubmit={handleUpdateUser}>
                        <h3>Edit User</h3>

                        <label>
                            Username
                            <input
                                value={editForm.username}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        username: e.target.value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Role
                            <select
                                value={editForm.role}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        role: e.target.value,
                                    })
                                }
                            >
                                <option value="admin">Admin</option>
                                <option value="adopter">Adopter</option>
                                <option value="foster">Foster</option>
                            </select>
                        </label>

                        <label>
                            Status
                            <select
                                value={editForm.status}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        status: e.target.value,
                                    })
                                }
                            >
                                <option value="active">Active</option>
                                <option value="disabled">Disabled</option>
                            </select>
                        </label>

                        <label>
                            Verified
                            <select
                                value={editForm.verified ? "true" : "false"}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        verified: e.target.value === "true",
                                    })
                                }
                            >
                                <option value="true">Verified</option>
                                <option value="false">Not Verified</option>
                            </select>
                        </label>

                        <div className="admin-user-form-actions">
                            <button type="submit">Save Changes</button>
                            <button type="button" onClick={handleCancelEdit}>
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {loading ? (
                    <p className="admin-empty">Loading users...</p>
                ) : users.length === 0 ? (
                    <p className="admin-empty">No users found.</p>
                ) : (
                    <div className="admin-user-list">
                        {users.map((user) => (
                            <article className="admin-user-row" key={user._id}>
                                <div>
                                    <h3>{user.username || user.name || "Unnamed User"}</h3>
                                    <p>{user.email}</p>
                                    <small>ID: {user._id}</small>
                                </div>

                                <div className="admin-user-badges">
                                    <span>{user.role || "adopter"}</span>
                                    <span>{user.status || "active"}</span>
                                    <span>
                                        {user.verified ? "Verified" : "Not Verified"}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => handleEditUser(user)}
                                >
                                    Edit
                                </button>
                            </article>
                        ))}
                    </div>
                )}
            </section>
        </section>
    );
}