import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import { DONATION_UNITS, resolveUnit } from "../../../utils/donationUnits";
import "leaflet/dist/leaflet.css";

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

// Coloured strip on each needed-supply card
const PRIORITY_TONE = {
    Urgent: "is-urgent",
    High: "is-high",
    Medium: "is-medium",
    Low: "is-low",
};

const emptyDonation = {
    category: "Pet Food",
    itemName: "",
    quantity: "",
    unit: "Pieces",
    otherUnit: "",
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

function formatPeso(amount) {
    return `₱${Number(amount).toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

export default function DonationCenter() {
    const [donation, setDonation] =
        useState(readDraft);

    // Donor said they've sent the money (step 2 of 3); uploading the receipt also counts
    const [hasSentPayment, setHasSentPayment] = useState(false);
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

        if (!isMoneyDonation && donation.category === "Other" && !donation.itemName.trim()) {
            setMessage("Please say what item you're donating.");
            return;
        }

        const unit = resolveUnit(donation.unit, donation.otherUnit);

        if (!isMoneyDonation && !unit) {
            setMessage("Please type the unit (e.g. trays, dozens).");
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
                    ? `Unit: ${unit}`
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

            setDonation({
                ...emptyDonation,
            });
            setHasSentPayment(false);
            setIsCustomAmount(false);
            try {
                sessionStorage.removeItem(DRAFT_KEY);
            } catch {
                // storage unavailable: nothing to clear
            }

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
    function handleSelectNeededSupply(supply) {
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

        donationFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    const donationFormRef = useRef(null);
    const selectedSupply = neededSupplies.find((supply) => supply._id === donation.neededSupplyId);

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
        fetchNeededSupplies();
        fetchPaymentMethods();

        fetch(`${API}/api/settings/drop-off`, { headers: { "ngrok-skip-browser-warning": "true" } })
            .then((response) => response.json())
            .then((data) => setDropOff(data.dropOff?.enabled && data.dropOff.address ? data.dropOff : null))
            .catch(() => setDropOff(null));
    }, []);

    // Goal-Gradient: show where the donor is in the three steps
    const amountValue = Number(donation.quantity);
    const hasAmount = donation.quantity !== "" && Number.isFinite(amountValue) && amountValue >= 1;
    const itemUnit = resolveUnit(donation.unit, donation.otherUnit);
    const itemLabel = donation.itemName.trim() || donation.category;

    const steps = isMoneyDonation
        ? [
            { label: "Choose an amount", done: hasAmount },
            { label: `Send it through ${donation.paymentMethod || "the shelter's account"}`, done: hasSentPayment || Boolean(donation.image) },
            { label: "Upload your receipt", done: Boolean(donation.image) },
        ]
        : [
            { label: "Choose what you're giving", done: hasAmount && Boolean(itemUnit) },
            { label: "Add a photo of the items", done: Boolean(donation.image) },
            { label: "Pledge it", done: false },
        ];
    const currentStepIndex = Math.max(0, steps.findIndex((step) => !step.done));

    // Fitts / Von Restorff: one specific, always-reachable button that names the gift
    const submitLabel = isMoneyDonation
        ? hasAmount ? `Confirm my ${formatPeso(amountValue)} gift` : "Confirm my gift"
        : hasAmount && itemUnit ? `Pledge ${amountValue} ${itemUnit.toLowerCase()} of ${itemLabel}` : "Pledge my items";

    const missingHint = isMoneyDonation
        ? !hasAmount ? "Choose an amount to continue."
            : !donation.paymentMethod ? "Pick how you'll send it."
                : !donation.image ? "Add your receipt to finish."
                    : ""
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
                                            <span aria-hidden="true">→</span>
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <section className="adopter-panel-form" ref={donationFormRef}>
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

                    <ol className="donation-steps" aria-label={`Step ${currentStepIndex + 1} of ${steps.length}`}>
                        {steps.map((step, index) => (
                            <li
                                key={step.label}
                                className={step.done ? "is-done" : index === currentStepIndex ? "is-current" : ""}
                            >
                                <span aria-hidden="true">{step.done ? "✓" : index + 1}</span>
                                {step.label}
                            </li>
                        ))}
                    </ol>

                    <div className="donation-layout">
                        <div className="donation-fields">
                            {selectedSupply && !isMoneyDonation && (
                                <div className="donation-selected-supply">
                                    <span>
                                        Donating for <b>{selectedSupply.name}</b> · {getRemaining(selectedSupply)} more needed
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => setDonation((current) => ({ ...current, neededSupplyId: "", itemName: "" }))}
                                    >
                                        Clear
                                    </button>
                                </div>
                            )}

                            {isMoneyDonation ? (
                                <>
                                    <div className="donation-choice">
                                        <span>How much? <b>*</b></span>
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

                                        {isCustomAmount && (
                                            <input
                                                type="number"
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
                                        <span>Send it through <b>*</b></span>
                                        {paymentMethods.length > 0 ? (
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
                                        ) : (
                                            <small className="donation-choice-note">
                                                {loadingPaymentMethods ? "Loading the shelter's accounts..." : "No payment account has been added yet."}
                                            </small>
                                        )}
                                    </div>
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

                                    {donation.category === "Other" && (
                                        <label>
                                            <span>Please specify the item <b>*</b></span>
                                            <input
                                                type="text"
                                                maxLength={80}
                                                placeholder="e.g. Pet carrier, grooming brush"
                                                value={donation.itemName}
                                                onChange={(event) => updateDonationField("itemName", event.target.value)}
                                                required
                                            />
                                        </label>
                                    )}

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
                                            <span>Type the unit <b>*</b></span>
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
                                                <dt>Account Name</dt>
                                                <dd>{selectedMethod.account_name}</dd>
                                                <dt>Account Number</dt>
                                                <dd>{selectedMethod.account_number}</dd>
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
                                                ? "Loading the shelter's payment accounts..."
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
                            {submitting ? "Sending..." : submitLabel}
                        </button>

                        {missingHint && (
                            <p className="donation-submit-hint" aria-live="polite">{missingHint}</p>
                        )}
                    </div>

                    <p className="donation-note">
                        Your donation shows as <strong>Pending</strong> until the shelter confirms it.
                    </p>
                </form>
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