
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_BACKEND_URL;

const donationCategories = [
    "Pet Food",
    "Medical Supplies",
    "Blankets & Bedding",
    "Cleaning Supplies",
    "Pet Toys",
    "Pet Accessories",
    "Feeding Bowls",
    "Leashes & Collars",
    "Other",
];

const donationUnits = [
    "Pieces",
    "Boxes",
    "Bags",
    "Bottles",
    "Packs",
    "Kilograms",
    "Liters",
    "Other",
];

const emptyDonation = {
    category: "Pet Food",
    itemName: "",
    quantity: "",
    unit: "Pieces",
    deliveryMethod: "Drop-off",
    preferredDate: "",
    description: "",
    image: "",
    neededSupplyId: "",
};

export default function DonationCenter() {
    const [donation, setDonation] =
        useState(emptyDonation);

    const [submitting, setSubmitting] =
        useState(false);

    const [uploadingImage, setUploadingImage] =
        useState(false);

    const [message, setMessage] = useState("");

    const [neededSupplies, setNeededSupplies] =
        useState([]);

    const [loadingSupplies, setLoadingSupplies] =
        useState(true);

    const [paymentMethods, setPaymentMethods] =
        useState([]);

    const [loadingPaymentMethods, setLoadingPaymentMethods] =
        useState(true);

    const token = localStorage.getItem("token");

    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

    function updateDonationField(field, value) {
        setDonation((current) => ({
            ...current,
            [field]: value,
        }));
    }

    async function handleUploadImage(event) {
        const file = event.target.files?.[0];

        if (!file) return;

        try {
            setUploadingImage(true);
            setMessage("");

            const formData = new FormData();

            formData.append("image", file);
            formData.append(
                "folder",
                "rescuebase/donations"
            );

            const response = await fetch(
                `${API}/api/uploads/image`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to upload image."
                );
                return;
            }

            setDonation((current) => ({
                ...current,
                image: data.imageUrl,
            }));

            setMessage(
                "Donation image uploaded successfully."
            );
        } catch (error) {
            console.error(error);

            setMessage(
                "Server error while uploading image."
            );
        } finally {
            setUploadingImage(false);
            event.target.value = "";
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();

        if (!donation.itemName.trim()) {
            setMessage("Please enter an item name.");
            return;
        }

        if (
            !donation.quantity ||
            Number(donation.quantity) < 1
        ) {
            setMessage(
                "Quantity must be at least 1."
            );
            return;
        }

        if (!donation.preferredDate) {
            setMessage(
                "Please select a preferred delivery date."
            );
            return;
        }

        try {
            setSubmitting(true);
            setMessage("");

            const payload = {
                donorName:
                    savedUser.name ||
                    savedUser.username ||
                    "Anonymous",

                donorEmail:
                    savedUser.email || "",

                donationType:
                    donation.category,

                itemName:
                    donation.itemName.trim(),

                quantity:
                    Number(donation.quantity),

                notes: [
                    `Unit: ${donation.unit}`,
                    `Delivery Method: ${donation.deliveryMethod}`,
                    `Preferred Date: ${donation.preferredDate}`,
                    donation.description.trim(),
                ]
                    .filter(Boolean)
                    .join("\n"),

                neededSupplyId:
                    donation.neededSupplyId || null,

                status: "pending",
            };

            const response = await fetch(
                `${API}/api/donations`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json();

            console.log(
                "DONATION STATUS:",
                response.status
            );

            console.log(
                "DONATION RESPONSE:",
                data
            );

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to submit donation."
                );
                return;
            }

            setDonation({
                ...emptyDonation,
            });

            setMessage(
                "Thank you! Your donation request has been submitted."
            );
        } catch (error) {
            console.error(error);

            setMessage(
                "Server error while submitting donation."
            );
        } finally {
            setSubmitting(false);
        }
    }

    async function fetchNeededSupplies() {
        try {
            setLoadingSupplies(true);

            const response = await fetch(
                `${API}/api/supplies`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                console.error(
                    data.message ||
                    "Failed to fetch needed supplies."
                );
                return;
            }

            const activeSupplies =
                (data.supplies || []).filter(
                    (supply) =>
                        supply.status === "active" &&
                        Number(
                            supply.quantityNeeded || 0
                        ) >
                        Number(
                            supply.quantityReceived || 0
                        )
                );

            setNeededSupplies(activeSupplies);
        } catch (error) {
            console.error(
                "Fetch needed supplies error:",
                error
            );
        } finally {
            setLoadingSupplies(false);
        }
    }

    async function fetchPaymentMethods() {
        try {
            setLoadingPaymentMethods(true);

            const response = await fetch(
                `${API}/api/payment-methods`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            console.log("PAYMENT STATUS:", response.status);
            console.log("PAYMENT RESPONSE:", data);

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to fetch payment methods."
                );
            }

            const methods = Array.isArray(data)
                ? data
                : data.methods ||
                data.paymentMethods ||
                data.data ||
                [];

            setPaymentMethods(methods);
        } catch (error) {
            console.error("Fetch payment methods error:", error);
            setPaymentMethods([]);
        } finally {
            setLoadingPaymentMethods(false);
        }
    }

    function handleSelectNeededSupply(supply) {
        const remaining = Math.max(
            0,
            Number(supply.quantityNeeded || 0) -
            Number(supply.quantityReceived || 0)
        );

        setDonation((current) => ({
            ...current,
            neededSupplyId: supply._id,
            category:
                supply.category || "Other",
            itemName: supply.name || "",
            description:
                `Donation for ${supply.name}. ` +
                `Remaining needed: ${remaining}.`,
        }));

        setMessage(
            `Selected: ${supply.name}`
        );
    }

    function getRemaining(supply) {
        return Math.max(
            0,
            Number(supply.quantityNeeded || 0) -
            Number(supply.quantityReceived || 0)
        );
    }

    function formatStatus(status) {
        const labels = {
            active: "Active",
            fulfilled: "Fulfilled",
            inactive: "Inactive",
        };

        return labels[status] || status;
    }

    useEffect(() => {
        fetchNeededSupplies();
        fetchPaymentMethods();
    }, []);

    return (
        <section className="adopter-donation-page">
            <section className="adopter-donation-hero">
                <span>❤️ Donation</span>

                <h2>
                    Support RescueBase by donating
                    essential supplies.
                </h2>

                <p>
                    Every donated item helps rescued
                    animals receive proper care while
                    waiting for their forever homes.
                </p>
            </section>

            <section className="adopter-panel needed-supplies-panel">
                <div className="adopter-panel-heading">
                    <div>
                        <h2>Needed Supplies</h2>

                        <p>
                            Help provide supplies currently
                            needed by our shelter.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchNeededSupplies}
                    >
                        Refresh
                    </button>
                </div>

                {loadingSupplies ? (
                    <p>
                        Loading needed supplies...
                    </p>
                ) : neededSupplies.length === 0 ? (
                    <p>
                        No active supplies are
                        currently listed.
                    </p>
                ) : (
                    <div className="needed-supplies-grid">
                        {neededSupplies.map((supply) => {
                            const remaining =
                                getRemaining(supply);

                            return (
                                <article
                                    className="needed-supply-card"
                                    key={supply._id}
                                >
                                    <h3>
                                        {supply.name}
                                    </h3>

                                    <p>
                                        <strong>
                                            Category:
                                        </strong>{" "}
                                        {supply.category}
                                    </p>

                                    <p>
                                        <strong>
                                            Priority:
                                        </strong>{" "}
                                        {supply.priority}
                                    </p>

                                    <p>
                                        <strong>
                                            Needed:
                                        </strong>{" "}
                                        {supply.quantityNeeded}
                                    </p>

                                    <p>
                                        <strong>
                                            Received:
                                        </strong>{" "}
                                        {supply.quantityReceived}
                                    </p>

                                    <p>
                                        <strong>
                                            Remaining:
                                        </strong>{" "}
                                        {remaining}
                                    </p>

                                    {supply.description && (
                                        <p>
                                            {
                                                supply.description
                                            }
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            handleSelectNeededSupply(
                                                supply
                                            )
                                        }
                                        disabled={
                                            remaining <= 0
                                        }
                                    >
                                        Donate This Item
                                    </button>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="adopter-panel donation-form-panel">
                <div className="adopter-panel-heading">
                    <div>
                        <h2>Donation Form</h2>

                        <p>
                            Fill out the details below.
                            Our shelter staff will review
                            your donation request.
                        </p>
                    </div>
                </div>

                <form
                    className="donation-form"
                    onSubmit={handleSubmit}
                >
                    <label>
                        Donation Category

                        <select
                            value={donation.category}
                            onChange={(event) =>
                                updateDonationField(
                                    "category",
                                    event.target.value
                                )
                            }
                        >
                            {donationCategories.map(
                                (category) => (
                                    <option
                                        key={category}
                                        value={category}
                                    >
                                        {category}
                                    </option>
                                )
                            )}
                        </select>
                    </label>

                    <label>
                        Item Name

                        <input
                            value={donation.itemName}
                            onChange={(event) =>
                                updateDonationField(
                                    "itemName",
                                    event.target.value
                                )
                            }
                            placeholder="Example: Royal Canin Puppy Food"
                            required
                        />
                    </label>

                    <div className="donation-row">
                        <label>
                            Quantity

                            <input
                                type="number"
                                min="1"
                                value={donation.quantity}
                                onChange={(event) =>
                                    updateDonationField(
                                        "quantity",
                                        event.target.value
                                    )
                                }
                                required
                            />
                        </label>

                        <label>
                            Unit

                            <select
                                value={donation.unit}
                                onChange={(event) =>
                                    updateDonationField(
                                        "unit",
                                        event.target.value
                                    )
                                }
                            >
                                {donationUnits.map(
                                    (unit) => (
                                        <option
                                            key={unit}
                                            value={unit}
                                        >
                                            {unit}
                                        </option>
                                    )
                                )}
                            </select>
                        </label>
                    </div>

                    <label>
                        Delivery Method

                        <select
                            value={donation.deliveryMethod}
                            onChange={(event) =>
                                updateDonationField(
                                    "deliveryMethod",
                                    event.target.value
                                )
                            }
                        >
                            <option value="Drop-off">
                                Drop-off
                            </option>

                            <option value="Shelter Pickup">
                                Shelter Pickup
                            </option>
                        </select>
                    </label>

                    <label>
                        Preferred Delivery Date

                        <input
                            type="date"
                            min={
                                new Date()
                                    .toISOString()
                                    .split("T")[0]
                            }
                            value={donation.preferredDate}
                            onChange={(event) =>
                                updateDonationField(
                                    "preferredDate",
                                    event.target.value
                                )
                            }
                            required
                        />
                    </label>

                    <label className="donation-full">
                        Description

                        <textarea
                            rows="5"
                            placeholder="Tell us more about your donation..."
                            value={donation.description}
                            onChange={(event) =>
                                updateDonationField(
                                    "description",
                                    event.target.value
                                )
                            }
                        />
                    </label>

                    <label>
                        Upload Photo (Optional)

                        <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingImage}
                            onChange={handleUploadImage}
                        />
                    </label>

                    {donation.image && (
                        <div className="donation-image-preview">
                            <img
                                src={donation.image}
                                alt="Donation"
                            />

                            <span>
                                {uploadingImage
                                    ? "Uploading..."
                                    : "Image Ready"}
                            </span>
                        </div>
                    )}

                    {message && (
                        <p className="donation-message">
                            {message}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            uploadingImage
                        }
                    >
                        {submitting
                            ? "Submitting..."
                            : "Submit Donation"}
                    </button>
                </form>
            </section>

            <section className="adopter-panel payment-methods-panel">
                <div className="adopter-panel-heading">
                    <div>
                        <h2>
                            Test Payment Methods
                        </h2>

                        <p>
                            These payment details are
                            for testing only. No actual
                            payment is processed.
                        </p>
                    </div>
                </div>

                {loadingPaymentMethods ? (
                    <p>
                        Loading payment methods...
                    </p>
                ) : paymentMethods.length === 0 ? (
                    <p>
                        No payment methods are
                        currently available.
                    </p>
                ) : (
                    <div className="payment-methods-grid">
                        {paymentMethods.map((method) => (
                            <article
                                className="payment-method-card"
                                key={method._id}
                            >
                                <h3>
                                    {method.method_type}
                                </h3>

                                {method.is_test && (
                                    <strong>
                                        TEST MODE
                                    </strong>
                                )}

                                <p>
                                    <strong>
                                        Account Name:
                                    </strong>{" "}
                                    {method.account_name}
                                </p>

                                <p>
                                    <strong>
                                        Account Number:
                                    </strong>{" "}
                                    {method.account_number}
                                </p>

                                {method.qr_image_url && (
                                    <img
                                        src={
                                            method.qr_image_url
                                        }
                                        alt={`${method.method_type} test QR code`}
                                    />
                                )}

                                {method.instructions && (
                                    <p>
                                        {
                                            method.instructions
                                        }
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>

            <section className="adopter-panel donation-info-panel">
                <div className="adopter-panel-heading">
                    <div>
                        <h2>
                            Accepted Donations
                        </h2>

                        <p>
                            We gladly accept the following
                            items for our rescued animals.
                        </p>
                    </div>
                </div>

                <div className="donation-category-grid">
                    <article>
                        <span>🍖</span>
                        <h3>Pet Food</h3>
                        <p>
                            Dry food, wet food,
                            treats and milk.
                        </p>
                    </article>

                    <article>
                        <span>💊</span>
                        <h3>Medical Supplies</h3>
                        <p>
                            Medicines, vitamins,
                            syringes and bandages.
                        </p>
                    </article>

                    <article>
                        <span>🛏️</span>
                        <h3>Blankets</h3>
                        <p>
                            Beds, blankets,
                            towels and cushions.
                        </p>
                    </article>

                    <article>
                        <span>🧸</span>
                        <h3>Pet Toys</h3>
                        <p>
                            Balls, ropes and chew
                            toys.
                        </p>
                    </article>

                    <article>
                        <span>🧴</span>
                        <h3>Cleaning Supplies</h3>
                        <p>
                            Disinfectants,
                            detergents and wipes.
                        </p>
                    </article>

                    <article>
                        <span>🐾</span>
                        <h3>Accessories</h3>
                        <p>
                            Leashes, collars,
                            bowls and carriers.
                        </p>
                    </article>
                </div>

                <div className="donation-note">
                    <h3>
                        Thank you ❤️
                    </h3>

                    <p>
                        Every donation helps RescueBase
                        provide better care for rescued
                        animals while they wait for their
                        forever homes.
                    </p>
                </div>
            </section>
        </section>
    );
}