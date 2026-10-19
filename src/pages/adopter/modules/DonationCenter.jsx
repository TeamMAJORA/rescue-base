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
    "Money",
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

const inKindCategories = donationCategories.filter(
    (category) => category !== "Money"
);

// TODO: replace with the shelter's real drop-off details
const SHELTER_DROPOFF = {
    name: "Shelter name",
    address: "Shelter address, Cebu City",
    contact: "09XX XXX XXXX",
};

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
    paymentMethod: "",
    paymentReference: "",
    proofOfPayment: "",
};

export default function DonationCenter() {
    const [donation, setDonation] =
        useState(emptyDonation);

    const [selected, setSelected] = 
        useState("monetary");

    const [submitting, setSubmitting] =
        useState(false);

    const [uploadingImage, setUploadingImage] =
        useState(false);

    const [message, setMessage] =
        useState("");

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

    const isMoneyDonation =
        donation.category === "Money";

    const selectedMethod = paymentMethods.find(
        (method) => method.method_type === donation.paymentMethod
    );

    function updateDonationField(field, value) {
        setDonation((current) => ({
            ...current,
            [field]: value,
        }));
    }

    function handleCategoryChange(category) {
        setDonation((current) => ({
            ...current,
            category,
            itemName: "",
            quantity: "",
            unit: "Pieces",
            deliveryMethod:
                category === "Money"
                    ? "Online Payment"
                    : "Drop-off",
            preferredDate: "",
            description: "",
            image: "",
            neededSupplyId: "",
            paymentMethod: "",
            paymentReference: "",
            proofOfPayment: "",
        }));

        setMessage("");
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
                proofOfPayment: isMoneyDonation
                    ? data.imageUrl
                    : current.proofOfPayment,
            }));

            setMessage(
                isMoneyDonation
                    ? "Proof of payment uploaded successfully."
                    : "Donation image uploaded successfully."
            );
        } catch (error) {
            console.error(
                "Upload image error:",
                error
            );

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

        const itemName =
            donation.itemName.trim() ||
            (isMoneyDonation
                ? "Monetary Donation"
                : donation.category);

        if (
            !donation.quantity ||
            !Number.isFinite(Number(donation.quantity)) ||
            Number(donation.quantity) < 1
        ) {
            setMessage(
                isMoneyDonation
                    ? "Donation amount must be at least ₱1."
                    : "Quantity must be at least 1."
            );
            return;
        }

        if (
            isMoneyDonation &&
            !donation.paymentMethod
        ) {
            setMessage(
                "Please select a payment method."
            );
            return;
        }

        if (!donation.image) {
            setMessage(
                isMoneyDonation
                    ? "Please upload your proof of payment."
                    : "Please upload a photo of the item."
            );
            return;
        }

        try {
            setSubmitting(true);
            setMessage("");

            const notes = [
                !isMoneyDonation
                    ? `Unit: ${donation.unit}`
                    : "Donation Type: Monetary Donation",

                !isMoneyDonation
                    ? `Delivery Method: ${donation.deliveryMethod}`
                    : "Payment Method: " +
                      (donation.paymentMethod || "Not specified"),

                donation.preferredDate
                    ? `Preferred Date: ${donation.preferredDate}`
                    : "",

                isMoneyDonation &&
                donation.paymentReference.trim()
                    ? `Payment Reference: ${donation.paymentReference.trim()}`
                    : "",

                donation.description.trim(),
            ]
                .filter(Boolean)
                .join("\n");

            const payload = {
                donorName:
                    savedUser.name ||
                    savedUser.username ||
                    "Anonymous",

                donorEmail:
                    savedUser.email || "",

                donationType:
                    donation.category,

                itemName,

                quantity:
                    Number(donation.quantity),

                notes,

                neededSupplyId:
                    donation.neededSupplyId || null,

                paymentMethod:
                    isMoneyDonation
                        ? donation.paymentMethod || ""
                        : "",

                paymentReference:
                    isMoneyDonation
                        ? donation.paymentReference.trim()
                        : "",

                proofOfPayment:
                    isMoneyDonation
                        ? donation.proofOfPayment || ""
                        : "",

                image:
                    donation.image || "",

                paymentStatus:
                    isMoneyDonation
                        ? "pending"
                        : "not_required",

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
            console.error(
                "Submit donation error:",
                error
            );

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

            console.log(
                "PAYMENT STATUS:",
                response.status
            );

            console.log(
                "PAYMENT RESPONSE:",
                data
            );

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Failed to fetch payment methods."
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
            console.error(
                "Fetch payment methods error:",
                error
            );

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
            neededSupplyId:
                supply._id,

            category:
                supply.category || "Other",

            itemName:
                supply.name || "",

            quantity:
                "",

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

    useEffect(() => {
        fetchNeededSupplies();
        fetchPaymentMethods();
    }, []);

    return (
        <section className="adopter-donation-page">
            <section className="adopter-donation-hero">
                <span> Donation</span>

                <h2>
                    Donate essential supplies and change a rescue pet's life.
                </h2>

                <p>
                   Your kindness keeps sweet souls safe, healthy, and
                   loved as they dream their forever home.
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

            <section className="adopter-panel-form">
                <div className="adopter-panel-heading">
                    <div>
                        <h2>Donate to Shelter Care</h2>
                        <p>
                            Your kindness provides food, medical care, and a safe shelter.
                        </p>
                    </div>
                </div>

                <form
                    className="donation-form"
                    onSubmit={handleSubmit}
                >
                    <div className="donation-toggle">
                        <button
                            type="button"
                            className={isMoneyDonation ? "active" : ""}
                            onClick={() => handleCategoryChange("Money")}
                        >
                            Monetary
                        </button>

                        <button
                            type="button"
                            className={!isMoneyDonation ? "active" : ""}
                            onClick={() => handleCategoryChange("Pet Food")}
                        >
                            In-Kind
                        </button>
                    </div>

                    <div className="donation-layout">
                        <div className="donation-fields">
                            {isMoneyDonation ? (
                                <>
                                    <label>
                                        <span>Mode of Payment <b>*</b></span>
                                        <select
                                            value={donation.paymentMethod}
                                            onChange={(event) =>
                                                updateDonationField(
                                                    "paymentMethod",
                                                    event.target.value
                                                )
                                            }
                                            required
                                        >
                                            <option value="">
                                                {loadingPaymentMethods
                                                    ? "Loading..."
                                                    : "Select payment method"}
                                            </option>
                                            {paymentMethods.map((method) => (
                                                <option
                                                    key={method._id}
                                                    value={method.method_type}
                                                >
                                                    {method.method_type}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <label>
                                        <span>Amount (₱) <b>*</b></span>
                                        <input
                                            type="number"
                                            min="1"
                                            step="0.01"
                                            placeholder="Enter amount"
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
                                </>
                            ) : (
                                <>
                                    <label>
                                        <span>What are you donating? <b>*</b></span>
                                        <select
                                            value={donation.category}
                                            onChange={(event) =>
                                                handleCategoryChange(
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {inKindCategories.map((category) => (
                                                <option
                                                    key={category}
                                                    value={category}
                                                >
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                    </label>

                                    <div className="donation-row">
                                        <label>
                                            <span>Quantity <b>*</b></span>
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                placeholder="0"
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
                                            <span>Unit</span>
                                            <select
                                                value={donation.unit}
                                                onChange={(event) =>
                                                    updateDonationField(
                                                        "unit",
                                                        event.target.value
                                                    )
                                                }
                                            >
                                                {donationUnits.map((unit) => (
                                                    <option key={unit} value={unit}>
                                                        {unit}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>
                                </>
                            )}

                            <label className="donation-upload">
                                <span>
                                    {isMoneyDonation
                                        ? "Proof of Payment"
                                        : "Proof of Item"}{" "}
                                    <b>*</b>
                                </span>

                                <input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingImage}
                                    onChange={handleUploadImage}
                                    hidden
                                />

                                <div className="donation-upload-box">
                                    {donation.image ? (
                                        <img
                                            src={donation.image}
                                            alt={
                                                isMoneyDonation
                                                    ? "Proof of payment"
                                                    : "Proof of item"
                                            }
                                        />
                                    ) : (
                                        <>
                                            <strong>
                                                {uploadingImage
                                                    ? "Uploading..."
                                                    : "Click to Upload"}
                                            </strong>
                                            <small>PNG or JPG</small>
                                        </>
                                    )}
                                </div>
                            </label>
                        </div>

                        <aside className="donation-info-card">
                            {isMoneyDonation ? (
                                <>
                                    <h4>
                                        Send to this{" "}
                                        {selectedMethod
                                            ? selectedMethod.method_type
                                            : "account"}
                                    </h4>

                                    {selectedMethod ? (
                                        <div className="donation-info-body">
                                            <div className="donation-info-qr">
                                                {selectedMethod.qr_image_url && (
                                                    <img
                                                        src={selectedMethod.qr_image_url}
                                                        alt={`${selectedMethod.method_type} QR code`}
                                                    />
                                                )}
                                            </div>

                                            <dl>
                                                <dt>Account Name</dt>
                                                <dd>{selectedMethod.account_name}</dd>
                                                <dt>Account Number</dt>
                                                <dd>{selectedMethod.account_number}</dd>
                                            </dl>
                                        </div>
                                    ) : (
                                        <p className="donation-info-empty">
                                            Select a mode of payment to see where to send your donation.
                                        </p>
                                    )}

                                    <small>
                                        Scan the QR code or send directly to this number.
                                    </small>
                                </>
                            ) : (
                                <>
                                    <h4>Bring it to the shelter</h4>

                                    <div className="donation-info-body">
                                        <div className="donation-info-qr" />

                                        <dl>
                                            <dt>Shelter</dt>
                                            <dd>{SHELTER_DROPOFF.name}</dd>
                                            <dt>Address</dt>
                                            <dd>{SHELTER_DROPOFF.address}</dd>
                                            <dt>Contact</dt>
                                            <dd>{SHELTER_DROPOFF.contact}</dd>
                                        </dl>
                                    </div>

                                    <small>
                                        You or a friend can drop this off anytime.
                                    </small>
                                </>
                            )}
                        </aside>
                    </div>

                    {message && (
                        <p className="donation-message">{message}</p>
                    )}

                    <button
                        type="submit"
                        className="donation-submit"
                        disabled={submitting || uploadingImage}
                    >
                        {submitting ? "Submitting..." : "Submit Donation"}
                    </button>

                    <p className="donation-note">
                        Your donation shows as <strong>Pending</strong> until the shelter confirms it.
                    </p>
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
                            Shelter's Current Needs
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
                        <h3>Puppy Food</h3>
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
                        <h3>Pet Beds</h3>
                        <p>
                            Beds, blankets,
                            towels and cushions.
                        </p>
                    </article>

                    <article>
                        <span>🧸</span>
                        <h3>Leashes</h3>
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
                        <span>💰</span>
                        <h3>Monetary</h3>
                        <p>
                            Every donation helps an animal in need
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