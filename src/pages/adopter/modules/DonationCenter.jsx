<<<<<<< HEAD
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

// Payment options donors can choose (same list the server accepts)
const PAYMENT_METHOD_OPTIONS = ["GCash", "Maya", "Bank Account"];

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

        if (isMoneyDonation && Number(donation.quantity) > 100000) {
            setMessage("Donation amount can't be more than ₱100,000.");
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

                amount:
                    isMoneyDonation
                        ? Number(donation.quantity)
                        : 0,

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
                                            {PAYMENT_METHOD_OPTIONS.map((methodType) => {
                                                const hasShelterAccount = paymentMethods.some(
                                                    (method) => method.method_type === methodType
                                                );

                                                return (
                                                    <option
                                                        key={methodType}
                                                        value={methodType}
                                                        disabled={!hasShelterAccount}
                                                    >
                                                        {hasShelterAccount
                                                            ? methodType
                                                            : `${methodType} (not available yet)`}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </label>

                                    <label>
                                        <span>Amount (₱) <b>*</b></span>
                                        <input
                                            type="number"
                                            min="1"
                                            max={isMoneyDonation ? 100000 : 1000}
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
                                                max={isMoneyDonation ? 100000 : 1000}
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
=======
import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { DONATION_UNITS, resolveUnit } from "../../../utils/donationUnits";
import "leaflet/dist/leaflet.css";
import { formatDate } from "../../../utils/formatDate";
import { formatPeso } from "../../../utils/formatMoney";
import LoadingState from "../../../components/system/LoadingState";
import Icon from "../../../components/system/Icon";
import NumberInput from "../../../components/system/NumberInput";
import RequiredValue from "../../../components/system/RequiredValue";

const API = import.meta.env.VITE_BACKEND_URL;

const DROP_OFF_PIN = L.divIcon({
    className: "donation-map-pin",
    html: "<span></span>",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
});

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

const inKindCategories = donationCategories.filter(
    (category) => category !== "Money"
);

// Needed-supply categories that the donation form names differently
const SUPPLY_TO_DONATION_CATEGORY = {
    Medicine: "Medical Supplies",
    "Feeding Supplies": "Feeding Bowls",
};

function donationCategoryForSupply(supply) {
    const category = SUPPLY_TO_DONATION_CATEGORY[supply.category] || supply.category;
    return inKindCategories.includes(category) ? category : "Other";
}

// Typing "dog food" picks Pet Food for the donor (Tesler's Law: the form does the sorting).
// Staff can't change a donation's type later, so the donor still sees and can fix the pick.
const CATEGORY_KEYWORDS = [
    ["Pet Food", ["food", "kibble", "canned", "treat", "rice", "dog chow", "cat chow", "pellet"]],
    ["Medical Supplies", ["medicine", "vitamin", "spray", "deworm", "bandage", "vaccine", "syringe", "ointment", "shampoo"]],
    ["Blankets & Bedding", ["blanket", "towel", "bed", "pillow", "mat", "cushion", "sheet"]],
    ["Cleaning Supplies", ["litter", "soap", "detergent", "bleach", "disinfect", "mop", "trash bag", "wipes"]],
    ["Pet Toys", ["toy", "ball", "chew", "squeak"]],
    ["Feeding Bowls", ["bowl", "feeder", "water dispenser"]],
    ["Leashes & Collars", ["leash", "collar", "harness"]],
    ["Pet Accessories", ["carrier", "cage", "crate", "kennel", "brush", "comb"]],
];

function guessCategory(itemName) {
    const text = itemName.toLowerCase();
    const match = CATEGORY_KEYWORDS.find(([, keywords]) => keywords.some((keyword) => text.includes(keyword)));
    return match ? match[0] : "";
}

const PRIORITY_ORDER = ["Urgent", "High", "Medium", "Low"];
const MAX_SUPPLY_SUGGESTIONS = 4;

// Coloured strip on each needed-supply card
const PRIORITY_TONE = {
    Urgent: "is-urgent",
    High: "is-high",
    Medium: "is-medium",
    Low: "is-low",
};

// In-kind starts with no type picked; the donor (or the keyword guess) picks one
const emptyDonation = {
    category: "",
    itemName: "",
    quantity: "",
    unit: "Pieces",
    otherUnit: "",
    // Typed by the donor when the type is "Other"; saved in the notes as "Type: ..." (the server only accepts its fixed types)
    otherCategory: "",
    deliveryMethod: "Drop-off",
    preferredDate: "",
    description: "",
    image: "",
    neededSupplyId: "",
    paymentMethod: "",
    paymentReference: "",
    proofOfPayment: "",
    showNamePublicly: false,
};

// One-tap amounts (Hick's Law: a few clear choices beat a blank box); 250 starts selected
const AMOUNT_PRESETS = [100, 250, 500, 1000];
const DEFAULT_AMOUNT = 250;

// The form survives a trip to GCash and back (the page can reload while the donor is in another app)
const DRAFT_KEY = "rescuebase_donation_draft";

function readDraft() {
    try {
        const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null");
        return draft ? { ...emptyDonation, ...draft } : emptyDonation;
    } catch {
        return emptyDonation;
    }
}


export default function DonationCenter({ onOpenDonationHistory }) {
    const [donation, setDonation] =
        useState(readDraft);

    // Donor said they've sent the money (step 2 of 3); uploading the receipt also counts
    const [hasSentPayment, setHasSentPayment] = useState(false);
    // Peak-End: after submitting, the form is replaced by a thank-you card describing the gift
    const [submittedGift, setSubmittedGift] = useState(null);
    const [isAccountNumberCopied, setIsAccountNumberCopied] = useState(false);
    const [copyErrorMessage, setCopyErrorMessage] = useState("");
    const [areAllSuppliesShown, setAreAllSuppliesShown] = useState(false);
    const [isCategoryPickedByDonor, setIsCategoryPickedByDonor] = useState(false);
    // Social proof: how many gifts reached the shelter in the last 30 days (counts only)
    const [recentGiftCount, setRecentGiftCount] = useState(0);
    const [isCustomAmount, setIsCustomAmount] = useState(
        () => donation.quantity !== "" && !AMOUNT_PRESETS.includes(Number(donation.quantity))
    );

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

    // Set by staff on the Donations page; null until loaded or when not shown
    const [dropOff, setDropOff] = useState(null);

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
            quantity: category === "Money" ? String(DEFAULT_AMOUNT) : "",
            unit: "Pieces",
            otherUnit: "",
            otherCategory: "",
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

        setIsCustomAmount(false);
        setHasSentPayment(false);
        setIsCategoryPickedByDonor(false);
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
                        "ngrok-skip-browser-warning": "true",
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

        // Required fields, amounts and choices were checked by the browser (errors show under each field)
        const unit = resolveUnit(donation.unit, donation.otherUnit);

        // No payment account set up yet: there are no buttons to choose from
        if (
            isMoneyDonation &&
            !donation.paymentMethod
        ) {
            setMessage(
                "Please select a payment method."
            );
            return;
        }

        try {
            setSubmitting(true);
            setMessage("");

            const notes = [
                !isMoneyDonation
                    ? `Unit: ${unit}`
                    : "Donation Type: Monetary Donation",

                !isMoneyDonation && donation.category === "Other"
                    ? `Type: ${donation.otherCategory.trim()}`
                    : "",

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

                // For money the input holds the peso amount; quantity is always 1
                quantity:
                    isMoneyDonation
                        ? 1
                        : Number(donation.quantity),

                amount:
                    isMoneyDonation
                        ? Number(donation.quantity)
                        : 0,

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

                itemPhotoUrl:
                    isMoneyDonation
                        ? ""
                        : donation.image || "",

                paymentStatus:
                    isMoneyDonation
                        ? "pending"
                        : "not_required",

                status: "pending",

                showNamePublicly: donation.showNamePublicly,
            };

            const response = await fetch(
                `${API}/api/donations`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                        "ngrok-skip-browser-warning": "true",
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

            setSubmittedGift({
                isMoney: isMoneyDonation,
                description: isMoneyDonation
                    ? `${formatPeso(Number(donation.quantity))} via ${donation.paymentMethod}`
                    : `${Number(donation.quantity)} ${resolveUnit(donation.unit, donation.otherUnit).toLowerCase()} of ${itemName}`,
                willBeThankedPublicly: donation.showNamePublicly,
                submittedOn: formatDate(new Date(), { withYear: false }),
            });
            setDonation({
                ...emptyDonation,
            });
            setHasSentPayment(false);
            setIsCustomAmount(false);
            setIsCategoryPickedByDonor(false);
            try {
                sessionStorage.removeItem(DRAFT_KEY);
            } catch {
                // storage unavailable: nothing to clear
            }

            setMessage("");
            donationFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
                        "ngrok-skip-browser-warning": "true",
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
                        "ngrok-skip-browser-warning": "true",
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

    // "Donate" on a needed-supply card: fill the In-Kind form for that item and jump to it
    function handleSelectNeededSupply(supply, { shouldScrollToForm = true } = {}) {
        const remaining = getRemaining(supply);

        setDonation((current) => ({
            ...current,
            neededSupplyId: supply._id,
            category: donationCategoryForSupply(supply),
            itemName: supply.name || "",
            quantity: String(Math.min(remaining, 1000)),
            // Food supplies are tracked in kilograms (Food Storage)
            unit: supply.foodInventoryId ? "Kilograms" : current.unit,
            deliveryMethod: current.category === "Money" ? "Drop-off" : current.deliveryMethod,
            paymentMethod: "",
            paymentReference: "",
            proofOfPayment: "",
            description:
                current.description ||
                `Donation for ${supply.name}. Remaining needed: ${remaining}.`,
        }));

        setMessage("");

        if (shouldScrollToForm) {
            donationFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }

    // Typing replaces any linked supply unless the text still names it; the type is guessed until the donor picks one
    function handleItemNameChange(itemName) {
        setDonation((current) => {
            const linkedSupply = neededSupplies.find((supply) => supply._id === current.neededSupplyId);
            const stillNamesLinkedSupply = linkedSupply && linkedSupply.name === itemName;
            return {
                ...current,
                itemName,
                neededSupplyId: stillNamesLinkedSupply ? current.neededSupplyId : "",
                category: isCategoryPickedByDonor ? current.category : guessCategory(itemName) || current.category,
            };
        });
    }

    const donationFormRef = useRef(null);

    function getRemaining(supply) {
        return Math.max(
            0,
            Number(supply.quantityNeeded || 0) -
            Number(supply.quantityReceived || 0)
        );
    }

    useEffect(() => {
        try {
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(donation));
        } catch {
            // storage unavailable: the form still works, it just won't survive a reload
        }
    }, [donation]);

    // Show an account straight away instead of an empty "pick one" step
    useEffect(() => {
        if (isMoneyDonation && !donation.paymentMethod && paymentMethods.length > 0) {
            updateDonationField("paymentMethod", paymentMethods[0].method_type);
        }
    }, [isMoneyDonation, donation.paymentMethod, paymentMethods]);

    useEffect(() => {
        fetch(`${API}/api/donations/supporters`, { headers: { "ngrok-skip-browser-warning": "true" } })
            .then((response) => (response.ok ? response.json() : null))
            .then((data) => setRecentGiftCount(Number(data?.summary?.donations) || 0))
            .catch(() => setRecentGiftCount(0));
    }, []);

    useEffect(() => {
        fetchNeededSupplies();
        fetchPaymentMethods();

        fetch(`${API}/api/settings/drop-off`, { headers: { "ngrok-skip-browser-warning": "true" } })
            .then((response) => response.json())
            .then((data) => setDropOff(data.dropOff?.enabled && data.dropOff.address ? data.dropOff : null))
            .catch(() => setDropOff(null));
    }, []);

    async function copyAccountNumber(accountNumber) {
        try {
            await navigator.clipboard.writeText(accountNumber);
            setCopyErrorMessage("");
            setIsAccountNumberCopied(true);
            setTimeout(() => setIsAccountNumberCopied(false), 2000);
        } catch {
            setCopyErrorMessage("Couldn't copy. Press and hold the number to copy it.");
        }
    }

    function startAnotherDonation() {
        setSubmittedGift(null);
    }

    // Goal-Gradient: show where the donor is in the three steps
    const amountValue = Number(donation.quantity);
    const hasAmount = donation.quantity !== "" && Number.isFinite(amountValue) && amountValue >= 1;
    const itemUnit = resolveUnit(donation.unit, donation.otherUnit);
    const itemLabel = donation.itemName.trim() || donation.category;

    const isOtherCategoryMissing = donation.category === "Other" && !donation.otherCategory.trim();

    const steps = isMoneyDonation
        ? [
            { label: "Choose an amount", done: hasAmount },
            { label: `Send it through ${donation.paymentMethod || "the shelter's account"}`, done: hasSentPayment || Boolean(donation.image) },
            { label: "Upload your receipt", done: Boolean(donation.image) },
        ]
        : [
            { label: "Say what you're giving", done: Boolean(donation.itemName.trim() && donation.category) && !isOtherCategoryMissing && hasAmount && Boolean(itemUnit) },
            { label: "Add a photo of the items", done: Boolean(donation.image) },
            { label: "Pledge it", done: false },
        ];
    const currentStepIndex = Math.max(0, steps.findIndex((step) => !step.done));

    // Von Restorff: most urgent needs first, and the urgent one looks different
    const supplySuggestions = neededSupplies
        .filter((supply) => getRemaining(supply) > 0)
        .sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
        .slice(0, MAX_SUPPLY_SUGGESTIONS);

    const dropOffDirectionsUrl = dropOff
        ? dropOff.latitude != null && dropOff.longitude != null
            ? `https://www.google.com/maps/search/?api=1&query=${dropOff.latitude},${dropOff.longitude}`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dropOff.address)}`
        : "";

    // Fitts / Von Restorff: one specific, always-reachable button that names the gift
    const submitLabel = isMoneyDonation
        ? hasAmount ? `Confirm my ${formatPeso(amountValue)} gift` : "Confirm my gift"
        : hasAmount && itemUnit ? `Pledge ${amountValue} ${itemUnit.toLowerCase()} of ${itemLabel}` : "Pledge my items";

    const missingHint = isMoneyDonation
        ? !hasAmount ? "Choose an amount to continue."
            : !donation.paymentMethod ? "Pick how you'll send it."
                : !donation.image ? "Add your receipt to finish."
                    : ""
        : !donation.itemName.trim() ? "Type what you're giving, or tap something the shelter needs."
            : !donation.category ? "Pick a type for your items."
            : isOtherCategoryMissing ? "Type what kind of items they are."
            : !hasAmount ? "Enter how many you're giving."
            : !itemUnit ? "Type the unit (e.g. trays, dozens)."
                : !donation.image ? "Add a photo of the items to finish."
                    : "";

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

                {/* The form sits below the supplies list, so give a one-tap way down to it */}
                <button
                    type="button"
                    className="donation-jump"
                    onClick={() => donationFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                    Donate now <Icon name="arrow-down" />
                </button>
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
                    <LoadingState label="Loading needed supplies…" />
                ) : neededSupplies.length === 0 ? (
                    <p>
                        No active supplies are
                        currently listed.
                    </p>
                ) : (
                    <div className={`needed-supplies-grid${areAllSuppliesShown ? " is-expanded" : ""}`}>
                        {neededSupplies.map((supply) => {
                            const remaining = getRemaining(supply);
                            const needed = Number(supply.quantityNeeded) || 0;
                            const received = Number(supply.quantityReceived) || 0;
                            const percentReceived = needed > 0 ? Math.min(100, (received / needed) * 100) : 0;
                            const isFullyStocked = remaining <= 0;
                            const isSelected = supply._id === donation.neededSupplyId;

                            return (
                                <article
                                    className={`needed-supply-card${isSelected ? " is-selected" : ""}`}
                                    key={supply._id}
                                >
                                    <div className="needed-supply-info">
                                        <h3>{supply.name}</h3>
                                        <span className="needed-supply-category">{supply.category}</span>

                                        {supply.description && (
                                            <p className="needed-supply-note">{supply.description}</p>
                                        )}

                                        <div className="needed-supply-progress" aria-hidden="true">
                                            <span style={{ width: `${percentReceived}%` }} />
                                        </div>
                                        <small className="needed-supply-count">
                                            {isFullyStocked
                                                ? `All ${needed} received. Thank you!`
                                                : `${remaining} more needed · ${received} of ${needed} received`}
                                        </small>
                                    </div>

                                    <div className={`needed-supply-strip ${isFullyStocked ? "is-done" : PRIORITY_TONE[supply.priority] || "is-medium"}`}>
                                        <span className="needed-supply-priority">
                                            {isFullyStocked ? "Stocked" : supply.priority || "Medium"}
                                        </span>

                                        <img src="/icons/sidebar/brown paw-light.svg" alt="" aria-hidden="true" />

                                        <button
                                            type="button"
                                            className="needed-supply-go"
                                            onClick={() => handleSelectNeededSupply(supply)}
                                            disabled={isFullyStocked}
                                            aria-label={`Donate ${supply.name}`}
                                            title={isFullyStocked ? "Fully stocked" : `Donate ${supply.name}`}
                                        >
                                            <Icon name="arrow-right" />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {neededSupplies.length > 2 && (
                    <button
                        type="button"
                        className="needed-supplies-more"
                        onClick={() => setAreAllSuppliesShown((current) => !current)}
                    >
                        {areAllSuppliesShown ? "Show fewer" : `Show all ${neededSupplies.length} supplies`}
                    </button>
                )}
            </section>

            <section className="adopter-panel-form" ref={donationFormRef}>
                <div className="adopter-panel-heading">
                    <div>
                        <h2>Donate to shelter care</h2>
                        <p>
                            Your kindness provides food, medical care, and a safe shelter.
                        </p>
                        {recentGiftCount > 0 && (
                            <p className="donation-social-proof">
                                <span aria-hidden="true">♥</span>
                                {recentGiftCount} {recentGiftCount === 1 ? "gift" : "gifts"} reached the shelter in the last 30 days
                            </p>
                        )}
                    </div>
                </div>

                {submittedGift ? (
                    <div className="donation-thanks" role="status">
                        <span className="donation-thanks-check" aria-hidden="true"><Icon name="check" /></span>
                        <h3>Thank you{savedUser.name ? `, ${savedUser.name.split(" ")[0]}` : ""}!</h3>
                        <p>We got your {submittedGift.isMoney ? "gift" : "pledge"}: <strong>{submittedGift.description}</strong></p>

                        {submittedGift.isMoney ? (
                            <ol className="donation-thanks-steps">
                                <li className="is-done">Sent to the shelter</li>
                                <li>The shelter checks your receipt</li>
                                <li>
                                    Marked as Received
                                    {submittedGift.willBeThankedPublicly && " and you're thanked on the home page"}
                                </li>
                            </ol>
                        ) : (
                            // Zeigarnik: in-kind isn't finished until the items arrive, so spell out the next move
                            <div className="donation-next">
                                <h4>What to do next</h4>
                                <ol>
                                    <li>
                                        {dropOff ? (
                                            <>
                                                <b>Bring your items to {dropOff.address}</b>
                                                {dropOff.operatingHours && <span>{dropOff.operatingHours}</span>}
                                                <a href={dropOffDirectionsUrl} target="_blank" rel="noopener noreferrer">
                                                    Get directions
                                                </a>
                                            </>
                                        ) : (
                                            <b>The shelter will message you about where to bring your items.</b>
                                        )}
                                    </li>
                                    <li>
                                        <b>Tell the staff your name, or show this screen</b>
                                        <span>Pledge: {submittedGift.description} · {submittedGift.submittedOn}</span>
                                    </li>
                                    <li>
                                        <b>The staff marks it Received</b>
                                        <span>
                                            It then shows as Received in Donation History
                                            {submittedGift.willBeThankedPublicly && ", and you're thanked on the home page"}.
                                        </span>
                                    </li>
                                </ol>
                            </div>
                        )}

                        <div className="donation-thanks-actions">
                            {onOpenDonationHistory && (
                                <button type="button" className="donation-thanks-primary" onClick={onOpenDonationHistory}>
                                    See my donations
                                </button>
                            )}
                            <button type="button" onClick={startAnotherDonation}>
                                Give again
                            </button>
                        </div>
                    </div>
                ) : (
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
                            onClick={() => handleCategoryChange("")}
                        >
                            In-Kind
                        </button>
                    </div>

                    <ol className="donation-steps" aria-label={`Step ${currentStepIndex + 1} of ${steps.length}`}>
                        {steps.map((step, index) => (
                            <li
                                key={step.label}
                                className={step.done ? "is-done" : index === currentStepIndex ? "is-current" : ""}
                            >
                                <span aria-hidden="true">{step.done ? <Icon name="check" /> : index + 1}</span>
                                {step.label}
                            </li>
                        ))}
                    </ol>

                    <div className="donation-layout">
                        <div className="donation-fields">
                            {isMoneyDonation ? (
                                <>
                                    <div className="donation-choice">
                                        <span>How much? <span className="required-mark">*</span></span>
                                        <div className="donation-pills" role="group" aria-label="Amount">
                                            {AMOUNT_PRESETS.map((amount) => {
                                                const isChosen = !isCustomAmount && amountValue === amount;
                                                return (
                                                    <button
                                                        key={amount}
                                                        type="button"
                                                        className={isChosen ? "is-active" : ""}
                                                        aria-pressed={isChosen}
                                                        onClick={() => {
                                                            setIsCustomAmount(false);
                                                            updateDonationField("quantity", String(amount));
                                                        }}
                                                    >
                                                        {formatPeso(amount)}
                                                    </button>
                                                );
                                            })}
                                            <button
                                                type="button"
                                                className={isCustomAmount ? "is-active" : ""}
                                                aria-pressed={isCustomAmount}
                                                onClick={() => {
                                                    setIsCustomAmount(true);
                                                    updateDonationField("quantity", "");
                                                }}
                                            >
                                                Other
                                            </button>
                                        </div>
                                        {!isCustomAmount && <RequiredValue value={donation.quantity} message="Choose an amount, or press Other to type one." />}

                                        {isCustomAmount && (
                                            <NumberInput
                                                min="1"
                                                max="100000"
                                                step="0.01"
                                                placeholder="Type an amount in pesos"
                                                aria-label="Other amount in pesos"
                                                value={donation.quantity}
                                                onChange={(event) => updateDonationField("quantity", event.target.value)}
                                                autoFocus
                                                required
                                            />
                                        )}
                                    </div>

                                    <div className="donation-choice">
                                        <span>Send it through <span className="required-mark">*</span></span>
                                        {paymentMethods.length > 0 ? (
                                            <>
                                            <div className="donation-pills" role="group" aria-label="Payment method">
                                                {paymentMethods.map((method) => {
                                                    const isChosen = donation.paymentMethod === method.method_type;
                                                    return (
                                                        <button
                                                            key={method._id}
                                                            type="button"
                                                            className={isChosen ? "is-active" : ""}
                                                            aria-pressed={isChosen}
                                                            onClick={() => {
                                                                setHasSentPayment(false);
                                                                updateDonationField("paymentMethod", method.method_type);
                                                            }}
                                                        >
                                                            {method.method_type}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <RequiredValue value={donation.paymentMethod} message="Choose how you'll send it." />
                                            </>
                                        ) : (
                                            <small className="donation-choice-note">
                                                {loadingPaymentMethods ? "Loading the shelter's accounts…" : "No payment account has been added yet."}
                                            </small>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Postel's Law: donors type it their way; suggestions fill the rest */}
                                    <label>
                                        <span>What are you giving? <span className="required-mark">*</span></span>
                                        <input
                                            type="text"
                                            maxLength={80}
                                            placeholder="e.g. dry dog food, old towels"
                                            value={donation.itemName}
                                            onChange={(event) => handleItemNameChange(event.target.value)}
                                            data-required-message="Say what you're giving."
                                            required
                                        />
                                    </label>

                                    {supplySuggestions.length > 0 && (
                                        <div className="donation-choice">
                                            <span>The shelter needs</span>
                                            <div className="donation-pills donation-supply-pills" role="group" aria-label="Needed supplies">
                                                {supplySuggestions.map((supply) => {
                                                    const isChosen = supply._id === donation.neededSupplyId;
                                                    const isUrgent = supply.priority === "Urgent";
                                                    return (
                                                        <button
                                                            key={supply._id}
                                                            type="button"
                                                            className={`${isChosen ? "is-active" : ""}${isUrgent ? " is-urgent" : ""}`}
                                                            aria-pressed={isChosen}
                                                            onClick={() => {
                                                                if (isChosen) {
                                                                    setDonation((current) => ({ ...current, neededSupplyId: "", itemName: "" }));
                                                                    return;
                                                                }
                                                                setIsCategoryPickedByDonor(true);
                                                                handleSelectNeededSupply(supply, { shouldScrollToForm: false });
                                                            }}
                                                        >
                                                            {supply.name}
                                                            <small>{isUrgent ? "Urgent · " : ""}{getRemaining(supply)} needed</small>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <div className="donation-choice">
                                        <span>Type <span className="required-mark">*</span></span>
                                        <div className="donation-pills donation-type-pills" role="group" aria-label="Type of items">
                                            {inKindCategories.map((category) => {
                                                const isChosen = donation.category === category;
                                                return (
                                                    <button
                                                        key={category}
                                                        type="button"
                                                        className={isChosen ? "is-active" : ""}
                                                        aria-pressed={isChosen}
                                                        onClick={() => {
                                                            setIsCategoryPickedByDonor(true);
                                                            updateDonationField("category", category);
                                                        }}
                                                    >
                                                        {category}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <RequiredValue value={donation.category} message="Pick a type for your items." />

                                        {donation.category === "Other" && (
                                            <input
                                                type="text"
                                                maxLength={40}
                                                placeholder="What kind of items? e.g. Grooming tools"
                                                aria-label="Type of items"
                                                value={donation.otherCategory}
                                                onChange={(event) => updateDonationField("otherCategory", event.target.value)}
                                                autoFocus
                                                required
                                            />
                                        )}
                                    </div>

                                    <div className="donation-row">
                                        <label>
                                            <span>Quantity <span className="required-mark">*</span></span>
                                            <NumberInput
                                                min="1"
                                                max={isMoneyDonation ? 100000 : 1000}
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
                                                {DONATION_UNITS.map((unit) => (
                                                    <option key={unit} value={unit}>
                                                        {unit}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    {donation.unit === "Other" && (
                                        <label>
                                            <span>Type the unit <span className="required-mark">*</span></span>
                                            <input
                                                type="text"
                                                maxLength={30}
                                                placeholder="e.g. Trays, Dozens"
                                                value={donation.otherUnit}
                                                onChange={(event) => updateDonationField("otherUnit", event.target.value)}
                                                required
                                            />
                                        </label>
                                    )}
                                </>
                            )}

                            <label className="donation-upload">
                                <span>
                                    {isMoneyDonation
                                        ? "Proof of payment"
                                        : "Proof of item"}{" "}
                                    <span className="required-mark">*</span>
                                </span>

                                <input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingImage}
                                    onChange={handleUploadImage}
                                    hidden
                                />
                                <RequiredValue
                                    value={donation.image}
                                    message={isMoneyDonation ? "Upload your proof of payment." : "Upload a photo of the item."}
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
                                                    ? "Uploading…"
                                                    : "Click to upload"}
                                            </strong>
                                            <small>PNG or JPG</small>
                                        </>
                                    )}
                                </div>
                            </label>
                        </div>

                        <aside className="donation-info-card">
                            {isMoneyDonation ? (
                                selectedMethod ? (
                                    <>
                                        <h4>Send to this {selectedMethod.method_type}</h4>

                                        <div className="donation-info-body">
                                            {selectedMethod.qr_image_url && (
                                                <div className="donation-info-qr">
                                                    <img
                                                        src={selectedMethod.qr_image_url}
                                                        alt={`${selectedMethod.method_type} QR code`}
                                                    />
                                                </div>
                                            )}

                                            <dl>
                                                <dt>Account name</dt>
                                                <dd>{selectedMethod.account_name}</dd>
                                                <dt>Account number</dt>
                                                <dd className="donation-account-number">
                                                    {selectedMethod.account_number}
                                                    <button
                                                        type="button"
                                                        className="donation-copy"
                                                        onClick={() => copyAccountNumber(selectedMethod.account_number)}
                                                    >
                                                        {isAccountNumberCopied ? <>Copied <Icon name="check" /></> : "Copy"}
                                                    </button>
                                                </dd>
                                                {copyErrorMessage && <dd className="donation-copy-error">{copyErrorMessage}</dd>}
                                                {selectedMethod.instructions && (
                                                    <>
                                                        <dt>Note</dt>
                                                        <dd>{selectedMethod.instructions}</dd>
                                                    </>
                                                )}
                                            </dl>
                                        </div>

                                        <small>
                                            {selectedMethod.qr_image_url
                                                ? "Scan the QR code or send to this account number."
                                                : "Send to this account number."}
                                        </small>

                                        <button
                                            type="button"
                                            className={`donation-sent${hasSentPayment || donation.image ? " is-done" : ""}`}
                                            aria-pressed={hasSentPayment}
                                            onClick={() => setHasSentPayment((current) => !current)}
                                        >
                                            {hasSentPayment || donation.image
                                                ? `✓ Sent ${hasAmount ? formatPeso(amountValue) : ""} — now add your receipt`
                                                : `I've sent ${hasAmount ? formatPeso(amountValue) : "it"}`}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <h4>Send your donation</h4>
                                        <p className="donation-info-empty">
                                            {loadingPaymentMethods
                                                ? "Loading the shelter's payment accounts…"
                                                : "The shelter hasn't added a payment account yet. You can donate items with In-Kind instead."}
                                        </p>
                                    </>
                                )
                            ) : dropOff ? (
                                <>
                                    <h4>Bring it to the shelter</h4>

                                    <div className="donation-info-body">
                                        {dropOff.latitude != null && dropOff.longitude != null && (
                                            <div className="donation-info-map">
                                                {/* Preview only: no dragging or zooming, tap opens directions */}
                                                <MapContainer
                                                    center={[dropOff.latitude, dropOff.longitude]}
                                                    zoom={16}
                                                    dragging={false}
                                                    zoomControl={false}
                                                    scrollWheelZoom={false}
                                                    doubleClickZoom={false}
                                                    touchZoom={false}
                                                    boxZoom={false}
                                                    keyboard={false}
                                                    style={{ height: "100%", width: "100%" }}
                                                >
                                                    <TileLayer
                                                        attribution="&copy; OpenStreetMap"
                                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                    />
                                                    <Marker position={[dropOff.latitude, dropOff.longitude]} icon={DROP_OFF_PIN} interactive={false} />
                                                </MapContainer>
                                                <a
                                                    className="donation-info-map-link"
                                                    href={`https://www.google.com/maps/search/?api=1&query=${dropOff.latitude},${dropOff.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    aria-label="Open the drop-off point in Google Maps"
                                                >
                                                    <span>Get directions ↗</span>
                                                </a>
                                            </div>
                                        )}

                                        <dl>
                                            <dt>Drop-off point</dt>
                                            <dd>{dropOff.address}</dd>
                                            {dropOff.operatingHours && (
                                                <>
                                                    <dt>Hours</dt>
                                                    <dd>{dropOff.operatingHours}</dd>
                                                </>
                                            )}
                                            {(dropOff.contactPerson || dropOff.contactNumber) && (
                                                <>
                                                    <dt>Contact</dt>
                                                    <dd>{[dropOff.contactPerson, dropOff.contactNumber].filter(Boolean).join(" · ")}</dd>
                                                </>
                                            )}
                                        </dl>
                                    </div>

                                    <small>{dropOff.instructions || "You or a friend can drop this off during these hours."}</small>
                                </>
                            ) : (
                                <>
                                    <h4>Bring it to the shelter</h4>
                                    <p className="donation-info-empty">
                                        The shelter hasn't posted its drop-off point yet. Please check back later.
                                    </p>
                                </>
                            )}
                        </aside>
                    </div>

                    <label className="donation-public-name">
                        <input
                            type="checkbox"
                            checked={donation.showNamePublicly}
                            onChange={(event) => updateDonationField("showNamePublicly", event.target.checked)}
                        />
                        <span>
                            <b>Thank me by name on the RescueBase home page</b>
                            Once the shelter receives it, we'll show your first name, last initial and what
                            you gave, including the amount for money gifts.
                        </span>
                    </label>

                    {message && (
                        <p className="donation-message">{message}</p>
                    )}

                    <div className="donation-submit-bar">
                        <button
                            type="submit"
                            className="donation-submit"
                            disabled={submitting || uploadingImage}
                        >
                            {submitting ? "Sending…" : submitLabel}
                        </button>

                        {missingHint && (
                            <p className="donation-submit-hint" aria-live="polite">{missingHint}</p>
                        )}
                    </div>

                    <p className="donation-note">
                        Your donation shows as <strong>Pending</strong> until the shelter confirms it.
                    </p>
                </form>
                )}
            </section>

            <section className="adopter-panel donation-info-panel">
                <div className="donation-note">
                    <h3>
                        Thank you <img className="inline-icon" src="/icons/red heart.svg" alt="" />
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
>>>>>>> b5f9c1969fa63c81eb46b139e16fabde87cf2dbe
