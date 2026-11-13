import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { isAdmin } from "../../../utils/auth";
import { searchCebuPlaces } from "../../../utils/cebuPlaces";
import { DONATION_UNITS, resolveUnit } from "../../../utils/donationUnits";

const CEBU_CENTER = [10.3157, 123.8854];

// Same orange pin as Intake Records (styles in IntakeRecords.css)
const DROP_OFF_PIN = L.divIcon({
    className: "ao-pin",
    html: "<span></span>",
    iconSize: [26, 34],
    iconAnchor: [13, 34],
});

// Tap the map to move the drop-off pin
function DropOffPinPicker({ onPick }) {
    useMapEvents({
        click(event) {
            onPick(event.latlng.lat, event.latlng.lng);
        },
    });
    return null;
}

// Keep the map centred on the pin
function DropOffMapFollow({ latitude, longitude }) {
    const map = useMap();
    useEffect(() => {
        if (latitude && longitude) map.setView([latitude, longitude], Math.max(map.getZoom(), 16));
    }, [map, latitude, longitude]);
    return null;
}

// Styled confirm popup from the dashboard (falls back to the browser box)
function askConfirm(options) {
    return window.rbConfirm
        ? window.rbConfirm(options)
        : Promise.resolve(window.confirm(options.title));
}

const API = import.meta.env.VITE_BACKEND_URL;

// ---------- drop-off hours: day buttons + two time pickers, saved as one line ----------
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toTwelveHour(time) {
    const [hour, minute] = String(time || "00:00").split(":").map(Number);
    const suffix = hour >= 12 ? "PM" : "AM";
    return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function toTwentyFourHour(text) {
    const match = String(text).trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return "";
    let hour = Number(match[1]) % 12;
    if (match[3].toUpperCase() === "PM") hour += 12;
    return `${String(hour).padStart(2, "0")}:${match[2]}`;
}

// [0,1,2,3,4,5] -> "Mon–Sat"; [0,2,4] -> "Mon, Wed, Fri"; all -> "Daily"
function formatDays(days) {
    const sorted = [...days].sort((a, b) => a - b);
    if (sorted.length === 7) return "Daily";
    const isRun = sorted.every((day, i) => i === 0 || day === sorted[i - 1] + 1);
    if (isRun && sorted.length > 2) return `${WEEK_DAYS[sorted[0]]}–${WEEK_DAYS[sorted[sorted.length - 1]]}`;
    return sorted.map((day) => WEEK_DAYS[day]).join(", ");
}

function formatHours(days, openTime, closeTime) {
    if (days.length === 0 || !openTime || !closeTime) return "";
    return `${formatDays(days)}, ${toTwelveHour(openTime)} – ${toTwelveHour(closeTime)}`;
}

// Reads back a line made by formatHours; anything else falls back to Mon–Sat, 8–5
function parseHours(text) {
    const fallback = { days: [0, 1, 2, 3, 4, 5], openTime: "08:00", closeTime: "17:00" };
    const match = String(text || "").match(/^(.+),\s*(\d{1,2}:\d{2}\s*[AP]M)\s*[–-]\s*(\d{1,2}:\d{2}\s*[AP]M)$/i);
    if (!match) return fallback;

    const dayPart = match[1].trim();
    let days = [];
    if (dayPart === "Daily") {
        days = [0, 1, 2, 3, 4, 5, 6];
    } else if (dayPart.includes("–")) {
        const [from, to] = dayPart.split("–").map((day) => WEEK_DAYS.indexOf(day.trim()));
        if (from >= 0 && to >= from) days = WEEK_DAYS.map((_, i) => i).filter((i) => i >= from && i <= to);
    } else {
        days = dayPart.split(",").map((day) => WEEK_DAYS.indexOf(day.trim())).filter((i) => i >= 0);
    }

    const openTime = toTwentyFourHour(match[2]);
    const closeTime = toTwentyFourHour(match[3]);
    return days.length && openTime && closeTime ? { days, openTime, closeTime } : fallback;
}

const PAGE_SIZE = 10;

const DONATION_TYPES = [
    "Money",
    "Pet Food",
    "Dog Food",
    "Cat Food",
    "Medicine",
    "Medical Supplies",
    "Blankets & Bedding",
    "Cleaning Supplies",
    "Pet Toys",
    "Pet Accessories",
    "Feeding Bowls",
    "Leashes & Collars",
    "Other Supplies",
    "Other",
];

// "cancelled" in the data = the donation never arrived
const STATUS_LABEL = { pending: "Pending", received: "Received", cancelled: "Not received" };

// Segmented type buttons on the Record Donation page (values must match the server enum)
const TYPE_BUTTONS = [
    { value: "Money", label: "Money" },
    { value: "Pet Food", label: "Pet Food" },
    { value: "Medicine", label: "Medicine" },
    { value: "Other Supplies", label: "Supplies" },
];


const DELIVERY_METHODS = ["Drop-off", "Shelter Pickup", "Courier Delivery", "Online Transfer", "Cash"];

// Names the server accepts for payment methods, and the type shown for each
const METHOD_NAMES = {
    GCash: "E-wallet",
    Maya: "E-wallet",
    "Bank Transfer": "Bank",
    "Wire Transfer": "Bank",
};

// Lines we keep inside `notes` because the donation model has no fields for them
const emptyDonationForm = {
    donorName: "",
    donorEmail: "",
    donationType: "Pet Food",
    amount: "",
    paymentReference: "",
    itemName: "",
    quantity: 1,
    notes: "",
    unit: "",
    otherUnit: "",
    deliveryMethod: "Drop-off",
    preferredDate: "",
};

const emptyMethodForm = {
    method_type: "GCash",
    account_name: "",
    account_number: "",
    qr_image_url: "",
    instructions: "",
    is_active: true,
};

// Split notes into the metadata lines and the free-text part
// Donor notes hold "Label: value" lines plus free text; already-shown fields are skipped
const LABELS_SHOWN_ELSEWHERE = ["donation type", "payment method", "payment reference"];

function notesAsRows(notes) {
    const rows = [];
    const text = [];

    String(notes || "").split("\n").forEach((line) => {
        const match = line.match(/^([A-Za-z ]{2,30}):\s*(.+)$/);
        if (!match) return text.push(line);
        if (!LABELS_SHOWN_ELSEWHERE.includes(match[1].trim().toLowerCase())) rows.push([match[1].trim(), match[2].trim()]);
    });

    return { rows, text: text.join("\n").trim() };
}

function buildNotes(form) {
    return [
        resolveUnit(form.unit, form.otherUnit) && `Unit: ${resolveUnit(form.unit, form.otherUnit)}`,
        form.deliveryMethod && `Delivery Method: ${form.deliveryMethod}`,
        form.preferredDate && `Preferred Date: ${form.preferredDate}`,
        form.notes.trim(),
    ]
        .filter(Boolean)
        .join("\n");
}

function Help({ text }) {
    return (
        <span className="dl-help" title={text} aria-label={text}>
            ?
        </span>
    );
}

// ---------- small helpers ----------

function isMoneyDonation(donation) {
    return donation.donationType === "Money";
}

// Older adopter records stored the money amount in `quantity`
function moneyValue(donation) {
    return Number(donation.amount) || Number(donation.quantity) || 0;
}

function peso(value) {
    return `₱${Number(value || 0).toLocaleString("en-PH")}`;
}

function formatDate(value) {
    if (!value) return "--";

    return new Date(value).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

// Pull "Label: value" lines out of the notes the adopter form writes
function noteValue(notes, label) {
    const match = String(notes || "").match(new RegExp(`${label}:\\s*(.+)`, "i"));
    return match ? match[1].trim() : "";
}

function typeTone(type) {
    const value = String(type || "").toLowerCase();

    if (value === "money") return "is-money";
    if (value.includes("food")) return "is-food";
    if (value.includes("medic")) return "is-medical";
    return "is-supplies";
}

function detailsFor(donation) {
    if (isMoneyDonation(donation)) {
        const reference = noteValue(donation.notes, "Payment Reference");

        return {
            main: peso(moneyValue(donation)),
            sub: [donation.paymentMethod, reference && `ref ${reference}`]
                .filter(Boolean)
                .join(" · "),
        };
    }

    const delivery = noteValue(donation.notes, "Delivery Method");
    const preferred = noteValue(donation.notes, "Preferred Date");

    return {
        main: `${donation.quantity || 1} item(s)${donation.itemName ? ` · ${donation.itemName}` : ""}`,
        sub: [delivery, preferred && `preferred ${formatDate(preferred)}`]
            .filter(Boolean)
            .join(" · "),
    };
}

function Icon({ name, size = 18 }) {
    const paths = {
        heart: <path d="M12 21s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 11c0 5.65-7 10-7 10z" />,
        pending: (
            <>
                <path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2" />
                <path d="M18 2v4h-4M6 22v-4h4" />
            </>
        ),
        check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
        peso: (
            <>
                <path d="M8 21V4h5a4.5 4.5 0 0 1 0 9H8" />
                <path d="M5 8h13M5 11h13" />
            </>
        ),
        refresh: (
            <>
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 3v6h-6" />
            </>
        ),
        card: (
            <>
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="M3 10h18" />
            </>
        ),
        plus: <path d="M12 5v14M5 12h14" />,
        edit: (
            <>
                <path d="M4 20h4L19 9l-4-4L4 16v4z" />
                <path d="M13.5 6.5l4 4" />
            </>
        ),
        eye: (
            <>
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
            </>
        ),
        more: (
            <>
                <circle cx="5" cy="12" r="1.2" />
                <circle cx="12" cy="12" r="1.2" />
                <circle cx="19" cy="12" r="1.2" />
            </>
        ),
    };

    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            {paths[name]}
        </svg>
    );
}

export default function Donations() {
    const [donations, setDonations] = useState([]);
    const [donationForm, setDonationForm] = useState(emptyDonationForm);
    const [viewingDonation, setViewingDonation] = useState(null);
    const [notReceivedFor, setNotReceivedFor] = useState(null);
    const [notReceivedReason, setNotReceivedReason] = useState("");
    const [notReceivedError, setNotReceivedError] = useState("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [message, setMessage] = useState("");
    const [showForm, setShowForm] = useState(false);

    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [sortBy, setSortBy] = useState("newest");
    const [page, setPage] = useState(1);
    const [openMenuId, setOpenMenuId] = useState(null);
    // Screen position of the open ⋯ menu (fixed, so the table can't clip it)
    const [openMenuPosition, setOpenMenuPosition] = useState({ top: 0, right: 0 });

    const [methods, setMethods] = useState([]);
    const [methodForm, setMethodForm] = useState(emptyMethodForm);
    const [editingMethodId, setEditingMethodId] = useState(null);
    const [methodMessage, setMethodMessage] = useState("");
    const [savingMethod, setSavingMethod] = useState(false);
    const [methodView, setMethodView] = useState("list");
    const [qrFileName, setQrFileName] = useState("");
    const [uploadingQr, setUploadingQr] = useState(false);
    // Drop-off point (where donors bring items); edited in the side card
    const [dropOff, setDropOff] = useState(null);
    const [dropOffForm, setDropOffForm] = useState(null);
    const [savingDropOff, setSavingDropOff] = useState(false);
    // Address search for the drop-off pin (only typing searches)
    const [typedDropOffAddress, setTypedDropOffAddress] = useState("");
    const [dropOffPlaces, setDropOffPlaces] = useState([]);
    const [searchingDropOffPlaces, setSearchingDropOffPlaces] = useState(false);
    const [dropOffPlacesOpen, setDropOffPlacesOpen] = useState(false);

    const token = localStorage.getItem("token");

    // ---------- data ----------

    async function fetchDonations() {
        try {
            setLoading(true);
            setMessage("");

            const response = await fetch(`${API}/api/donations`, {
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to fetch donations.");
                return;
            }

            setDonations(data.donations || []);
        } catch (error) {
            console.error("Fetch donations error:", error);
            setMessage("Server error while fetching donations.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDonations();
        fetchMethods();
        fetchDropOff();
    }, []);

    // Close the ⋯ menu when clicking anywhere else
    useEffect(() => {
        if (!openMenuId) return;

        const close = () => setOpenMenuId(null);
        document.addEventListener("click", close);
        window.addEventListener("scroll", close, true);
        window.addEventListener("resize", close);
        return () => {
            document.removeEventListener("click", close);
            window.removeEventListener("scroll", close, true);
            window.removeEventListener("resize", close);
        };
    }, [openMenuId]);

    // ---------- stats + filtering ----------

    const counts = useMemo(() => {
        const result = { all: donations.length, pending: 0, received: 0, cancelled: 0 };

        donations.forEach((donation) => {
            const status = donation.status || "pending";
            if (result[status] !== undefined) result[status] += 1;
        });

        return result;
    }, [donations]);

    const totalMoney = useMemo(() => {
        return donations
            .filter((d) => d.status === "received" && isMoneyDonation(d))
            .reduce((total, d) => total + moneyValue(d), 0);
    }, [donations]);

    const typeOptions = useMemo(() => {
        return [...new Set(donations.map((d) => d.donationType).filter(Boolean))].sort();
    }, [donations]);

    const visibleDonations = useMemo(() => {
        const term = search.trim().toLowerCase();

        const list = donations.filter((donation) => {
            const status = donation.status || "pending";
            const text = `${donation.donorName || ""} ${donation.donorEmail || ""} ${donation.itemName || ""}`.toLowerCase();

            if (term && !text.includes(term)) return false;
            if (typeFilter !== "all" && donation.donationType !== typeFilter) return false;
            if (statusFilter !== "all" && status !== statusFilter) return false;
            return true;
        });

        return list.sort((a, b) => {
            if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
            if (sortBy === "donor") return String(a.donorName || "").localeCompare(String(b.donorName || ""));
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
    }, [donations, search, typeFilter, statusFilter, sortBy]);

    const pageCount = Math.max(1, Math.ceil(visibleDonations.length / PAGE_SIZE));
    const currentPage = Math.min(page, pageCount);
    const pageRows = visibleDonations.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

    useEffect(() => {
        setPage(1);
    }, [search, typeFilter, statusFilter, sortBy]);

    // ---------- donation actions ----------

    async function handleSubmitDonation(e) {
        e.preventDefault();

        try {
            setSubmitting(true);
            setMessage("");

            const savedUser = JSON.parse(localStorage.getItem("rescuebase_user") || "{}");

            const money = donationForm.donationType === "Money";

            const payload = {
                donorName: donationForm.donorName.trim(),
                donorEmail: donationForm.donorEmail.trim(),
                donationType: donationForm.donationType,
                itemName: donationForm.itemName.trim() || (money ? "Monetary Donation" : ""),
                amount: money ? Number(donationForm.amount || 0) : 0,
                paymentReference: money ? donationForm.paymentReference.trim() : "",
                quantity: money ? 1 : Number(donationForm.quantity || 1),
                notes: buildNotes(donationForm),
                adminName: savedUser.name || savedUser.username || "Admin User",
                adminEmail: savedUser.email || "admin",
            };

            const response = await fetch(`${API}/api/donations`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to save donation record.");
                return;
            }

            setMessage("Donation created successfully.");
            setDonationForm(emptyDonationForm);
            setShowForm(false);
            fetchDonations();
        } catch (error) {
            console.error("Save donation error:", error);
            setMessage("Server error while saving donation.");
        } finally {
            setSubmitting(false);
        }
    }

    function openNewForm() {
        setDonationForm(emptyDonationForm);
        setMessage("");
        setShowForm(true);
    }

    function closeDonationForm() {
        setShowForm(false);
        setDonationForm(emptyDonationForm);
        setMessage("");
    }

    // Returns true when saved
    async function handleUpdateStatus(donationId, status, notReceivedReason = "") {
        try {
            setMessage("");

            const response = await fetch(`${API}/api/donations/${donationId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify(status === "cancelled" ? { status, notReceivedReason } : { status }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to update donation status.");
                return false;
            }

            setMessage("Donation status updated.");
            setViewingDonation((current) => (current?._id === donationId ? data.donation : current));
            fetchDonations();
            return true;
        } catch (error) {
            console.error("Update donation status error:", error);
            setMessage("Server error while updating donation status.");
            return false;
        }
    }

    // Opens the "Not received" box, which asks for the reason
    function handleMarkNotReceived(donation) {
        setNotReceivedFor(donation);
        setNotReceivedReason("");
        setNotReceivedError("");
    }

    async function submitNotReceived() {
        const reason = notReceivedReason.trim();
        if (reason.length < 5) {
            setNotReceivedError("Please give a short reason (at least 5 characters).");
            return;
        }

        const saved = await handleUpdateStatus(notReceivedFor._id, "cancelled", reason);
        if (saved) setNotReceivedFor(null);
    }

    async function handleDeleteDonation(donationId) {
        const confirmed = await askConfirm({
            title: "Delete this donation record?",
            message: "This can't be undone.",
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        try {
            setMessage("");

            const response = await fetch(`${API}/api/donations/${donationId}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(data.message || "Failed to delete donation record.");
                return;
            }

            setMessage("Donation deleted successfully.");
            setViewingDonation(null);
            fetchDonations();
        } catch (error) {
            console.error("Delete donation error:", error);
            setMessage("Server error while deleting donation.");
        }
    }

    // ---------- payment methods ----------

    async function fetchDropOff() {
        try {
            const response = await fetch(`${API}/api/settings/drop-off/manage`, {
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
            });
            const data = await response.json();
            if (response.ok && data.success) setDropOff(data.dropOff);
        } catch (error) {
            console.error("Fetch drop-off error:", error);
        }
    }

    // Typing an address pins the best match; picking from the list pins that one
    useEffect(() => {
        const query = typedDropOffAddress.trim();
        if (query.length < 3) {
            setDropOffPlaces([]);
            return undefined;
        }

        const controller = new AbortController();
        const timer = setTimeout(async () => {
            setSearchingDropOffPlaces(true);
            try {
                const places = await searchCebuPlaces(query, controller.signal);
                setDropOffPlaces(places);
                if (places[0]) pinDropOff(places[0].latitude, places[0].longitude);
            } catch (error) {
                if (error.name !== "AbortError") setDropOffPlaces([]);
            } finally {
                setSearchingDropOffPlaces(false);
            }
        }, 600);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [typedDropOffAddress]);

    function pinDropOff(latitude, longitude) {
        setDropOffForm((current) => current && {
            ...current,
            latitude: Number(Number(latitude).toFixed(6)),
            longitude: Number(Number(longitude).toFixed(6)),
        });
    }

    function chooseDropOffPlace(place) {
        pinDropOff(place.latitude, place.longitude);
        setDropOffForm((current) => ({ ...current, address: [place.name, place.area].filter(Boolean).join(", ") }));
        setDropOffPlacesOpen(false);
    }

    function editDropOff() {
        setTypedDropOffAddress("");
        setDropOffPlaces([]);
        setDropOffForm({
            enabled: false,
            address: "",
            contactPerson: "",
            contactNumber: "",
            operatingHours: "",
            instructions: "",
            latitude: null,
            longitude: null,
            ...(dropOff || {}),
            ...parseHours(dropOff?.operatingHours),
        });
        setMethodMessage("");
        setMethodView("dropoff");
    }

    async function saveDropOff(event) {
        event.preventDefault();

        try {
            setSavingDropOff(true);
            setMethodMessage("");
            const response = await fetch(`${API}/api/settings/drop-off`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify({
                    enabled: dropOffForm.enabled,
                    address: dropOffForm.address,
                    contactPerson: dropOffForm.contactPerson,
                    contactNumber: dropOffForm.contactNumber,
                    instructions: dropOffForm.instructions,
                    operatingHours: formatHours(dropOffForm.days, dropOffForm.openTime, dropOffForm.closeTime),
                    latitude: dropOffForm.latitude,
                    longitude: dropOffForm.longitude,
                }),
            });
            const data = await response.json().catch(() => ({}));

            if (!response.ok || !data.success) {
                // "Failed" makes the message show in red (see methodTone)
                setMethodMessage(`Failed to save: ${data.message || "drop-off details"}`);
                return;
            }

            setDropOff(data.dropOff);
            setDropOffForm(null);
            setMethodView("list");
            setMethodMessage("Drop-off details saved.");
        } catch (error) {
            console.error("Save drop-off error:", error);
            setMethodMessage("Server error while saving drop-off details.");
        } finally {
            setSavingDropOff(false);
        }
    }

    async function fetchMethods() {
        try {
            const response = await fetch(`${API}/api/payment-methods/all`, {
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                setMethodMessage(data.message || "Failed to load payment methods.");
                return;
            }

            setMethods(data.methods || []);
        } catch (error) {
            console.error("Fetch payment methods error:", error);
            setMethodMessage("Server error while loading payment methods.");
        }
    }

    function newMethod() {
        setEditingMethodId(null);
        setMethodForm(emptyMethodForm);
        setQrFileName("");
        setMethodMessage("");
        setMethodView("edit");
    }

    function editMethod(method) {
        setEditingMethodId(method._id);
        setMethodForm({
            method_type: method.method_type || "GCash",
            account_name: method.account_name || "",
            account_number: method.account_number || "",
            qr_image_url: method.qr_image_url || "",
            instructions: method.instructions || "",
            is_active: method.is_active !== false,
        });
        setQrFileName(method.qr_image_url ? "Current QR code" : "");
        setMethodMessage("");
        setMethodView("edit");
    }

    function backToMethodList() {
        setEditingMethodId(null);
        setMethodForm(emptyMethodForm);
        setMethodMessage("");
        setMethodView("list");
    }

    // How many donations were paid with this method (deleting it would orphan them)
    function methodUsage(methodType) {
        return donations.filter((d) => d.paymentMethod === methodType).length;
    }

    async function uploadQr(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setUploadingQr(true);
            setQrFileName(file.name);

            const formData = new FormData();
            formData.append("image", file);
            formData.append("folder", "rescuebase/payment-methods");

            const response = await fetch(`${API}/api/uploads/image`, {
                method: "POST",
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
                body: formData,
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                setMethodMessage(data.message || "Failed to upload QR image.");
                return;
            }

            setMethodForm((current) => ({ ...current, qr_image_url: data.imageUrl }));
        } catch (error) {
            console.error("Upload QR error:", error);
            setMethodMessage("Server error while uploading QR image.");
        } finally {
            setUploadingQr(false);
            event.target.value = "";
        }
    }

    async function saveMethod(e) {
        e.preventDefault();

        try {
            setSavingMethod(true);
            setMethodMessage("");

            const url = editingMethodId
                ? `${API}/api/payment-methods/${editingMethodId}`
                : `${API}/api/payment-methods`;

            const response = await fetch(url, {
                method: editingMethodId ? "PATCH" : "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                    "ngrok-skip-browser-warning": "true",
                },
                body: JSON.stringify(methodForm),
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                setMethodMessage(data.message || "Failed to save payment method.");
                return;
            }

            setMethodForm(emptyMethodForm);
            setEditingMethodId(null);
            setMethodView("list");
            setMethodMessage(editingMethodId ? "Payment method updated." : "Payment method added.");
            fetchMethods();
        } catch (error) {
            console.error("Save payment method error:", error);
            setMethodMessage("Server error while saving payment method.");
        } finally {
            setSavingMethod(false);
        }
    }

    async function deleteMethod(method) {
        const confirmed = await askConfirm({
            title: `Delete ${method.method_type}?`,
            message: "Adopters will no longer see this payment option.",
            confirmLabel: "Delete",
            danger: true,
        });

        if (!confirmed) return;

        try {
            const response = await fetch(`${API}/api/payment-methods/${method._id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}`, "ngrok-skip-browser-warning": "true" },
            });
            const data = await response.json();

            if (!response.ok || !data.success) {
                setMethodMessage(data.message || "Failed to delete payment method.");
                return;
            }

            backToMethodList();
            setMethodMessage("Payment method deleted.");
            fetchMethods();
        } catch (error) {
            console.error("Delete payment method error:", error);
            setMethodMessage("Server error while deleting payment method.");
        }
    }

    // ---------- render ----------

    const messageTone = /fail|error|required|invalid/i.test(message) ? "error" : "success";
    const methodTone = /fail|error|required|invalid/i.test(methodMessage) ? "error" : "success";

    if (showForm) {
        const money = donationForm.donationType === "Money";
        const typeButtons = TYPE_BUTTONS.some((item) => item.value === donationForm.donationType)
            ? TYPE_BUTTONS
            : [...TYPE_BUTTONS, { value: donationForm.donationType, label: donationForm.donationType }];

        const setField = (field, value) => setDonationForm((current) => ({ ...current, [field]: value }));

        return (
            <section className="dl-page">
                <header className="dl-head">
                    <div>
                        <h2>Donation Ledger</h2>
                        <p>Record and manage money, food, medicine, and supply donations.</p>
                    </div>

                    <button type="button" className="dl-btn" onClick={closeDonationForm}>
                        ← Back to Donations
                    </button>
                </header>

                <form className="dl-form-card" onSubmit={handleSubmitDonation}>
                    <div className="dl-form-section">
                        <h3>Donor & Donation</h3>
                        <p>Log a donation received or pledged. Fields marked * are required.</p>
                    </div>

                    <div className="dl-grid">
                        <label className="dl-field">
                            <span>Donor Name <b>*</b></span>
                            <input
                                value={donationForm.donorName}
                                placeholder="e.g. Juan Dela Cruz"
                                onChange={(e) => setField("donorName", e.target.value)}
                                required
                            />
                        </label>

                        <label className="dl-field">
                            <span>Donor Email</span>
                            <input
                                type="email"
                                value={donationForm.donorEmail}
                                placeholder="name@email.com"
                                onChange={(e) => setField("donorEmail", e.target.value)}
                            />
                        </label>

                        <div className="dl-field dl-span-2">
                            <span>Donation Type <b>*</b></span>
                            <div className="dl-seg">
                                {typeButtons.map((item) => (
                                    <button
                                        type="button"
                                        key={item.value}
                                        className={donationForm.donationType === item.value ? "on" : ""}
                                        onClick={() => setField("donationType", item.value)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <label className="dl-field">
                            <span>
                                Item Name {!money && <b>*</b>}{" "}
                                <Help text="What was donated, e.g. the brand or item. Optional for money." />
                            </span>
                            <input
                                value={donationForm.itemName}
                                placeholder={money ? "e.g. General fund" : "e.g. Dog food sack"}
                                onChange={(e) => setField("itemName", e.target.value)}
                                required={!money}
                            />
                        </label>

                        <label className="dl-field">
                            <span>Quantity {!money && <b>*</b>}</span>
                            <input
                                type="number"
                                min="1"
                                max="1000"
                                value={money ? 1 : donationForm.quantity}
                                disabled={money}
                                onChange={(e) => setField("quantity", e.target.value)}
                                required={!money}
                            />
                        </label>

                        <label className="dl-field">
                            <span>
                                Amount (₱) {money && <b>*</b>}{" "}
                                <Help text="Only used for Money donations." />
                            </span>
                            <input
                                type="number"
                                min="1"
                                max="100000"
                                step="any"
                                value={money ? donationForm.amount : ""}
                                placeholder={money ? "e.g. 500" : "Money donations only"}
                                disabled={!money}
                                onChange={(e) => setField("amount", e.target.value)}
                                required={money}
                            />
                        </label>

                        {money && (
                            <label className="dl-field">
                                <span>
                                    Receipt / Ref. no. <b>*</b>{" "}
                                    <Help text="Required for cash recorded by staff, since there is no proof-of-payment photo." />
                                </span>
                                <input
                                    type="text"
                                    maxLength={100}
                                    value={donationForm.paymentReference}
                                    placeholder="e.g. OR-000123"
                                    onChange={(e) => setField("paymentReference", e.target.value)}
                                    required
                                />
                            </label>
                        )}

                        <label className="dl-field dl-span-4">
                            <span>Notes</span>
                            <textarea
                                rows="3"
                                value={donationForm.notes}
                                placeholder="Additional donation details..."
                                onChange={(e) => setField("notes", e.target.value)}
                            />
                        </label>
                    </div>

                    <div className="dl-form-section is-divided">
                        <h3>Handover Details</h3>
                        <p>How and when the items reach the shelter.</p>
                    </div>

                    <div className="dl-grid">
                        <label className="dl-field">
                            <span>Unit</span>
                            <select
                                value={donationForm.unit}
                                disabled={money}
                                onChange={(e) => setField("unit", e.target.value)}
                            >
                                <option value="">Select</option>
                                {DONATION_UNITS.map((unit) => (
                                    <option key={unit} value={unit}>{unit}</option>
                                ))}
                            </select>
                        </label>

                        {!money && donationForm.unit === "Other" && (
                            <label className="dl-field">
                                <span>Type the unit</span>
                                <input
                                    maxLength={30}
                                    placeholder="e.g. Trays, Dozens"
                                    value={donationForm.otherUnit}
                                    onChange={(e) => setField("otherUnit", e.target.value)}
                                    required
                                />
                            </label>
                        )}

                        <label className="dl-field">
                            <span>Delivery Method</span>
                            <select
                                value={donationForm.deliveryMethod}
                                onChange={(e) => setField("deliveryMethod", e.target.value)}
                            >
                                {DELIVERY_METHODS.map((method) => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </select>
                        </label>

                        <label className="dl-field">
                            <span>Preferred Date</span>
                            <input
                                type="date"
                                value={donationForm.preferredDate}
                                onChange={(e) => setField("preferredDate", e.target.value)}
                            />
                        </label>
                    </div>

                    {message && <p className={`gs-alert ${messageTone}`}>{message}</p>}

                    <div className="dl-form-foot">
                        <small>Next: you can mark this donation as Received later from the ledger.</small>

                        <div className="dl-form-actions">
                            <button type="button" className="dl-btn" onClick={closeDonationForm}>
                                Cancel
                            </button>
                            <button type="submit" className="dl-btn primary" disabled={submitting}>
                                {submitting ? "Saving..." : "Save Donation"}
                            </button>
                        </div>
                    </div>
                </form>
            </section>
        );
    }

    return (
        <section className="dl-page">
            <header className="dl-head">
                <div />

                <div className="dl-head-actions">
                    <button type="button" className="dl-btn" onClick={fetchDonations}>
                        Refresh
                    </button>
                    <button type="button" className="dl-btn primary" onClick={openNewForm}>
                        + Record donation
                    </button>
                </div>
            </header>

            <div className="um-strip">
                <div className="um-strip-total">
                    <b>{counts.all}</b>
                    <small>Total donations</small>
                </div>
                <div>
                    <small>Pending receipt</small>
                    <b>{counts.pending}</b>
                </div>
                <div>
                    <small>Received</small>
                    <b>{counts.received}</b>
                </div>
                <div>
                    <small>Money received</small>
                    <b>{peso(totalMoney)}</b>
                </div>
            </div>

            {message && !showForm && <p className={`gs-alert ${messageTone} dl-message`}>{message}</p>}

            <div className="dl-layout">
            <div className="dl-card">
            <div className="dl-toolbar">
                <input
                    type="search"
                    className="dl-search"
                    placeholder="Search donor, email or item..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <label className="dl-select">
                    <span>Type</span>
                    <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="all">All types</option>
                        {typeOptions.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </label>

                <label className="dl-select">
                    <span>Sort</span>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="donor">Donor A–Z</option>
                    </select>
                </label>
            </div>

            <div className="dl-chips">
                {["all", "pending", "received", "cancelled"].map((value) => (
                    <button
                        type="button"
                        key={value}
                        className={statusFilter === value ? "on" : ""}
                        onClick={() => setStatusFilter(value)}
                    >
                        {value === "all" ? "All" : STATUS_LABEL[value]} <span>{counts[value]}</span>
                    </button>
                ))}
            </div>

            <div className="dl-table-card">
                {loading ? (
                    <p className="dl-empty">Loading donations...</p>
                ) : visibleDonations.length === 0 ? (
                    <p className="dl-empty">
                        {donations.length === 0 ? "No donations recorded yet." : "No donations match your filters."}
                    </p>
                ) : (
                    <div className="dl-table-wrap">
                        <table className="dl-table">
                            <thead>
                                <tr>
                                    <th>Donor</th>
                                    <th>Type</th>
                                    <th>Details</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th className="dl-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pageRows.map((donation) => {
                                    const status = donation.status || "pending";
                                    const details = detailsFor(donation);

                                    return (
                                        <tr key={donation._id} className={status === "cancelled" ? "is-off" : ""}>
                                            <td data-label="Donor">
                                                <div className="dl-donor">
                                                    <b>{donation.donorName || "Anonymous"}</b>
                                                    <span>{donation.donorEmail || "No email"}</span>
                                                </div>
                                            </td>
                                            <td data-label="Type">
                                                <span className={`dl-type ${typeTone(donation.donationType)}`}>
                                                    {donation.donationType}
                                                </span>
                                            </td>
                                            <td data-label="Details">
                                                <div className="dl-details">
                                                    <b>{details.main}</b>
                                                    {details.sub && <span>{details.sub}</span>}
                                                </div>
                                            </td>
                                            <td data-label="Status">
                                                <span className={`dl-status is-${status}`}>
                                                    {STATUS_LABEL[status] || status}
                                                </span>
                                            </td>
                                            <td data-label="Date" className="dl-date">{formatDate(donation.createdAt)}</td>
                                            <td data-label="Actions">
                                                <div className="dl-actions">
                                                    {status === "pending" ? (
                                                        <button
                                                            type="button"
                                                            className="dl-btn primary small"
                                                            onClick={() => handleUpdateStatus(donation._id, "received")}
                                                        >
                                                            Mark received
                                                        </button>
                                                    ) : (
                                                        <span className="dl-done">
                                                            {status === "received" ? "Done" : "—"}
                                                        </span>
                                                    )}

                                                    <button
                                                        type="button"
                                                        className="dl-icon-btn"
                                                        title="View details"
                                                        aria-label={`View donation from ${donation.donorName || "Anonymous"}`}
                                                        onClick={() => setViewingDonation(donation)}
                                                    >
                                                        <Icon name="eye" size={15} />
                                                    </button>

                                                    <div className="dl-menu-wrap">
                                                        <button
                                                            type="button"
                                                            className="dl-icon-btn"
                                                            title="More"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setOpenMenuPosition({
                                                                    top: rect.bottom + 4,
                                                                    right: window.innerWidth - rect.right,
                                                                });
                                                                setOpenMenuId(openMenuId === donation._id ? null : donation._id);
                                                            }}
                                                        >
                                                            <Icon name="more" size={15} />
                                                        </button>

                                                        {openMenuId === donation._id && (
                                                            <div
                                                                className="dl-menu"
                                                                style={{ top: openMenuPosition.top, right: openMenuPosition.right }}
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {status !== "cancelled" && (
                                                                    <button
                                                                        type="button"
                                                                        className="is-danger"
                                                                        onClick={() => {
                                                                            setOpenMenuId(null);
                                                                            handleMarkNotReceived(donation);
                                                                        }}
                                                                    >
                                                                        Mark as not received
                                                                    </button>
                                                                )}

                                                                {isAdmin() && (
                                                                    <button
                                                                        type="button"
                                                                        className="is-danger"
                                                                        onClick={() => {
                                                                            setOpenMenuId(null);
                                                                            handleDeleteDonation(donation._id);
                                                                        }}
                                                                    >
                                                                        Delete record
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {notReceivedFor && (
                <div className="ao-confirm-backdrop" onClick={() => setNotReceivedFor(null)}>
                    <div
                        className="ao-confirm danger dl-notreceived"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="dl-notreceived-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="dl-notreceived-title">Mark as not received?</h3>
                        <p>
                            {notReceivedFor.donorName || "The donor"}&apos;s donation stays in the ledger as
                            &quot;Not received&quot;. They&apos;ll see your reason.
                        </p>
                        <label className="dl-field">
                            <span>Reason *</span>
                            <textarea
                                rows={3}
                                maxLength={300}
                                autoFocus
                                value={notReceivedReason}
                                placeholder="e.g. Not dropped off by the preferred date; payment not found in GCash"
                                onChange={(event) => {
                                    setNotReceivedReason(event.target.value);
                                    setNotReceivedError("");
                                }}
                            />
                        </label>
                        {notReceivedError && <p className="dl-notreceived-error">{notReceivedError}</p>}
                        <div className="ao-confirm-actions">
                            <button type="button" onClick={() => setNotReceivedFor(null)}>
                                Keep it
                            </button>
                            <button type="button" className="ao-confirm-ok" onClick={submitNotReceived}>
                                Mark as not received
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {viewingDonation && (() => {
                const donation = viewingDonation;
                const status = donation.status || "pending";
                const money = isMoneyDonation(donation);
                const { rows: noteRows, text: noteText } = notesAsRows(donation.notes);
                const reference = donation.paymentReference || noteValue(donation.notes, "Payment Reference");
                const photo = money ? donation.proofOfPayment : donation.itemPhotoUrl;

                return (
                    <div className="dl-view-overlay" onClick={() => setViewingDonation(null)}>
                        <div
                            className="dl-view"
                            role="dialog"
                            aria-modal="true"
                            aria-label={`Donation from ${donation.donorName || "Anonymous"}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <header className="dl-view-head">
                                <div>
                                    <h3>{donation.donorName || "Anonymous"}</h3>
                                    <span>{donation.donorEmail || "No email"}</span>
                                </div>
                                <span className={`dl-status is-${status}`}>{STATUS_LABEL[status] || status}</span>
                                <button type="button" className="dl-view-close" onClick={() => setViewingDonation(null)} aria-label="Close">
                                    ×
                                </button>
                            </header>

                            <div className="dl-view-body">
                                <dl className="dl-view-facts">
                                    <div>
                                        <dt>Type</dt>
                                        <dd>{donation.donationType}</dd>
                                    </div>
                                    {money ? (
                                        <>
                                            <div>
                                                <dt>Amount</dt>
                                                <dd>{peso(moneyValue(donation))}</dd>
                                            </div>
                                            <div>
                                                <dt>Payment method</dt>
                                                <dd>{donation.paymentMethod || "Recorded by staff"}</dd>
                                            </div>
                                            <div>
                                                <dt>Reference no.</dt>
                                                <dd>{reference || "—"}</dd>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <dt>Item</dt>
                                                <dd>{donation.itemName || "—"}</dd>
                                            </div>
                                            <div>
                                                <dt>Quantity</dt>
                                                <dd>{donation.quantity || 1}</dd>
                                            </div>
                                        </>
                                    )}
                                    {noteRows.map(([label, value]) => (
                                        <div key={label}>
                                            <dt>{label}</dt>
                                            <dd>{label === "Preferred Date" ? formatDate(value) : value}</dd>
                                        </div>
                                    ))}
                                    <div>
                                        <dt>Submitted</dt>
                                        <dd>{formatDate(donation.createdAt)}</dd>
                                    </div>
                                    {donation.receivedDate && (
                                        <div>
                                            <dt>Received</dt>
                                            <dd>{formatDate(donation.receivedDate)}</dd>
                                        </div>
                                    )}
                                    {status === "cancelled" && (
                                        <div className="dl-view-wide">
                                            <dt>Not received because</dt>
                                            <dd>
                                                {donation.notReceivedReason || "No reason recorded."}
                                                {donation.notReceivedByName ? ` — ${donation.notReceivedByName}` : ""}
                                            </dd>
                                        </div>
                                    )}
                                    <div>
                                        <dt>Logged by</dt>
                                        <dd>{donation.createdByName || "—"}</dd>
                                    </div>
                                </dl>

                                {noteText && (
                                    <>
                                        <h4>Notes</h4>
                                        <p className="dl-view-notes">{noteText}</p>
                                    </>
                                )}

                                <h4>{money ? "Proof of payment" : "Photo of the items"}</h4>
                                {photo ? (
                                    <a href={photo} target="_blank" rel="noreferrer" className="dl-view-photo" title="Open full size">
                                        <img src={photo} alt={money ? "Proof of payment" : "Donated items"} />
                                    </a>
                                ) : (
                                    <p className="dl-view-nophoto">
                                        {money
                                            ? "No proof of payment was uploaded (recorded by staff with a receipt number)."
                                            : "No photo was uploaded with this donation."}
                                    </p>
                                )}
                            </div>

                            <footer className="dl-view-foot">
                                {isAdmin() && (
                                    <button
                                        type="button"
                                        className="dl-btn danger"
                                        onClick={() => handleDeleteDonation(donation._id)}
                                    >
                                        Delete record
                                    </button>
                                )}
                                {status !== "cancelled" && (
                                    <button
                                        type="button"
                                        className="dl-btn"
                                        onClick={() => handleMarkNotReceived(donation)}
                                    >
                                        Mark as not received
                                    </button>
                                )}
                                {status === "pending" && (
                                    <button
                                        type="button"
                                        className="dl-btn primary"
                                        onClick={() => handleUpdateStatus(donation._id, "received")}
                                    >
                                        Mark received
                                    </button>
                                )}
                            </footer>
                        </div>
                    </div>
                );
            })()}

            {!loading && visibleDonations.length > 0 && (
                <div className="dl-footer">
                    <span>
                        Showing {pageRows.length} of {visibleDonations.length} donation
                        {visibleDonations.length === 1 ? "" : "s"}
                    </span>

                    <div className="dl-pager">
                        <button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                            ‹
                        </button>
                        <b>{currentPage}</b>
                        <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                            ›
                        </button>
                    </div>
                </div>
            )}
            </div>

            {/* Payment methods side card */}
            <aside className="dl-card dl-pm dl-pm-side">
                        {methodView === "list" ? (
                            <>
                                <h3>Payment methods</h3>
                                <p className="dl-pm-sub">Shown to donors under Monetary. Click one to edit.</p>

                                {methodMessage && <p className={`gs-alert ${methodTone}`}>{methodMessage}</p>}

                                <div className="dl-method-list">
                                    {methods.length === 0 ? (
                                        <p className="dl-empty">No payment methods yet.</p>
                                    ) : (
                                        methods.map((method) => (
                                            <button
                                                type="button"
                                                className={`dl-method ${method.is_active ? "" : "is-off"}`}
                                                key={method._id}
                                                onClick={() => editMethod(method)}
                                            >
                                                <span className="dl-method-qr">
                                                    {method.qr_image_url && <img src={method.qr_image_url} alt="" />}
                                                </span>
                                                <span className="dl-method-info">
                                                    <b>{method.method_type}</b>
                                                    <span>{method.account_name} · {method.account_number}</span>
                                                </span>
                                                <span className={`dl-status ${method.is_active ? "is-received" : "is-cancelled"}`}>
                                                    {method.is_active ? "Active" : "Inactive"}
                                                </span>
                                            </button>
                                        ))
                                    )}
                                </div>

                                <div className="dl-pm-foot">
                                    <span />
                                    <button type="button" className="dl-btn primary" onClick={newMethod}>
                                        + Add method
                                    </button>
                                </div>

                                <h3 className="dl-dropoff-title">Drop-off point</h3>
                                <p className="dl-pm-sub">Where donors bring items. Shown on needed items. Click to edit.</p>
                                <button type="button" className="dl-method dl-dropoff" onClick={editDropOff}>
                                    <span className="dl-method-info">
                                        <b>{dropOff?.address || "Not set yet"}</b>
                                        <span>
                                            {[dropOff?.operatingHours, dropOff?.contactPerson, dropOff?.contactNumber]
                                                .filter(Boolean)
                                                .join(" · ") || "Add an address, hours and a contact"}
                                        </span>
                                    </span>
                                    <span className={`dl-status ${dropOff?.enabled ? "is-received" : "is-cancelled"}`}>
                                        {dropOff?.enabled ? "Shown" : "Hidden"}
                                    </span>
                                </button>
                            </>
                        ) : methodView === "dropoff" && dropOffForm ? (
                            <form onSubmit={saveDropOff}>
                                <h3>Drop-off point</h3>
                                <p className="dl-pm-sub">
                                    <button type="button" className="dl-link" onClick={backToMethodList}>
                                        ← Back to list
                                    </button>{" "}
                                    · Donors see this on the donation page and when they hover the (i) on needed items.
                                </p>

                                <div className="dl-field">
                                    <span>Address {dropOffForm.enabled && <b>*</b>}</span>
                                    <div className="ao-where-search">
                                        <input
                                            type="search"
                                            value={dropOffForm.address}
                                            maxLength={500}
                                            placeholder="e.g. RescueBase Shelter, Lahug, Cebu City"
                                            required={dropOffForm.enabled}
                                            autoComplete="off"
                                            onChange={(e) => {
                                                setDropOffForm({ ...dropOffForm, address: e.target.value });
                                                setTypedDropOffAddress(e.target.value);
                                                setDropOffPlacesOpen(true);
                                            }}
                                            onFocus={() => setDropOffPlacesOpen(true)}
                                            onBlur={() => setTimeout(() => setDropOffPlacesOpen(false), 150)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault(); // stops the form from saving
                                                    if (dropOffPlaces[0]) chooseDropOffPlace(dropOffPlaces[0]);
                                                }
                                                if (e.key === "Escape") setDropOffPlacesOpen(false);
                                            }}
                                        />
                                        {dropOffPlacesOpen && typedDropOffAddress.trim().length >= 3 && (
                                            <ul className="gm-map-results">
                                                {searchingDropOffPlaces && dropOffPlaces.length === 0 && <li className="is-note">Searching...</li>}
                                                {!searchingDropOffPlaces && dropOffPlaces.length === 0 && <li className="is-note">No places found in Cebu. Tap the map instead.</li>}
                                                {dropOffPlaces.map((place) => (
                                                    <li key={place.id}>
                                                        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => chooseDropOffPlace(place)}>
                                                            <b>{place.name}</b>
                                                            {place.area && <small>{place.area}</small>}
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>

                                    <div className="lfr2-map dl-dropoff-map">
                                        <MapContainer
                                            center={dropOffForm.latitude ? [dropOffForm.latitude, dropOffForm.longitude] : CEBU_CENTER}
                                            zoom={dropOffForm.latitude ? 16 : 12}
                                            scrollWheelZoom={false}
                                            style={{ height: "100%", width: "100%" }}
                                        >
                                            <TileLayer
                                                attribution="&copy; OpenStreetMap"
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <DropOffPinPicker onPick={pinDropOff} />
                                            <DropOffMapFollow latitude={dropOffForm.latitude} longitude={dropOffForm.longitude} />
                                            {dropOffForm.latitude && (
                                                <Marker
                                                    position={[dropOffForm.latitude, dropOffForm.longitude]}
                                                    icon={DROP_OFF_PIN}
                                                    draggable
                                                    eventHandlers={{
                                                        dragend: (event) => {
                                                            const point = event.target.getLatLng();
                                                            pinDropOff(point.lat, point.lng);
                                                        },
                                                    }}
                                                />
                                            )}
                                        </MapContainer>
                                    </div>

                                    <small className="lfr2-coord">
                                        {dropOffForm.latitude
                                            ? `Pinned at ${dropOffForm.latitude.toFixed(4)}, ${dropOffForm.longitude.toFixed(4)}. Drag the pin or tap the exact gate.`
                                            : "No pin yet. Type the address or tap the map. Donors see this map on the donation page."}
                                        {dropOffForm.latitude && (
                                            <>
                                                {" · "}
                                                <button
                                                    type="button"
                                                    className="dl-link"
                                                    onClick={() => setDropOffForm({ ...dropOffForm, latitude: null, longitude: null })}
                                                >
                                                    Remove pin
                                                </button>
                                            </>
                                        )}
                                    </small>
                                </div>

                                <div className="dl-field">
                                    <span>Open days</span>
                                    <div className="dl-days">
                                        {WEEK_DAYS.map((day, index) => {
                                            const on = dropOffForm.days.includes(index);
                                            return (
                                                <button
                                                    type="button"
                                                    key={day}
                                                    className={on ? "on" : ""}
                                                    aria-pressed={on}
                                                    onClick={() =>
                                                        setDropOffForm({
                                                            ...dropOffForm,
                                                            days: on
                                                                ? dropOffForm.days.filter((d) => d !== index)
                                                                : [...dropOffForm.days, index],
                                                        })
                                                    }
                                                >
                                                    {day}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="dl-grid">
                                    <label className="dl-field">
                                        <span>Opens</span>
                                        <input
                                            type="time"
                                            value={dropOffForm.openTime}
                                            onChange={(e) => setDropOffForm({ ...dropOffForm, openTime: e.target.value })}
                                        />
                                    </label>
                                    <label className="dl-field">
                                        <span>Closes</span>
                                        <input
                                            type="time"
                                            value={dropOffForm.closeTime}
                                            onChange={(e) => setDropOffForm({ ...dropOffForm, closeTime: e.target.value })}
                                        />
                                    </label>
                                </div>

                                <p className="dl-hours-preview">
                                    Donors see:{" "}
                                    <b>{formatHours(dropOffForm.days, dropOffForm.openTime, dropOffForm.closeTime) || "No hours set"}</b>
                                </p>

                                <div className="dl-grid">
                                    <label className="dl-field">
                                        <span>Contact person</span>
                                        <input
                                            value={dropOffForm.contactPerson}
                                            maxLength={150}
                                            placeholder="e.g. Ana Reyes"
                                            onChange={(e) => setDropOffForm({ ...dropOffForm, contactPerson: e.target.value })}
                                        />
                                    </label>

                                    <label className="dl-field">
                                        <span>Contact number</span>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            value={dropOffForm.contactNumber}
                                            maxLength={11}
                                            pattern="09[0-9]{9}"
                                            title="11-digit mobile number starting with 09, e.g. 09171234567"
                                            placeholder="e.g. 09171234567"
                                            onChange={(e) =>
                                                setDropOffForm({
                                                    ...dropOffForm,
                                                    // digits only, max 11
                                                    contactNumber: e.target.value.replace(/\D/g, "").slice(0, 11),
                                                })
                                            }
                                        />
                                    </label>
                                </div>

                                <label className="dl-field">
                                    <span>Instructions (optional)</span>
                                    <textarea
                                        rows="2"
                                        maxLength={1000}
                                        value={dropOffForm.instructions}
                                        placeholder="e.g. Ring the bell at the side gate."
                                        onChange={(e) => setDropOffForm({ ...dropOffForm, instructions: e.target.value })}
                                    />
                                </label>

                                <div className="dl-field">
                                    <span>Show to donors</span>
                                    <div className="dl-seg is-half">
                                        {[true, false].map((value) => (
                                            <button
                                                type="button"
                                                key={String(value)}
                                                className={dropOffForm.enabled === value ? "on" : ""}
                                                onClick={() => setDropOffForm({ ...dropOffForm, enabled: value })}
                                            >
                                                {value ? "Shown" : "Hidden"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {methodMessage && <p className={`gs-alert ${methodTone}`}>{methodMessage}</p>}

                                <div className="dl-pm-foot">
                                    <span />
                                    <div className="dl-form-actions">
                                        <button type="button" className="dl-btn" onClick={backToMethodList}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="dl-btn primary" disabled={savingDropOff}>
                                            {savingDropOff ? "Saving..." : "Save"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={saveMethod}>
                                <h3>{editingMethodId ? "Edit method" : "Add method"}</h3>
                                <p className="dl-pm-sub">
                                    <button type="button" className="dl-link" onClick={backToMethodList}>
                                        ← Back to list
                                    </button>{" "}
                                    · Changes show on the donor's Donation page right away.
                                </p>

                                <div className="dl-grid">
                                    <label className="dl-field">
                                        <span>Method Name <b>*</b></span>
                                        <select
                                            value={methodForm.method_type}
                                            onChange={(e) => setMethodForm({ ...methodForm, method_type: e.target.value })}
                                        >
                                            {Object.keys(METHOD_NAMES).map((name) => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </label>

                                    <label className="dl-field">
                                        <span>Method Type</span>
                                        <input value={METHOD_NAMES[methodForm.method_type] || "Other"} disabled />
                                    </label>

                                    <label className="dl-field">
                                        <span>Account Name <b>*</b></span>
                                        <input
                                            value={methodForm.account_name}
                                            placeholder="e.g. RescueBase Shelter"
                                            onChange={(e) => setMethodForm({ ...methodForm, account_name: e.target.value })}
                                            required
                                        />
                                    </label>

                                    <label className="dl-field">
                                        <span>
                                            Account Number <b>*</b> <Help text="The mobile or bank account number donors send to." />
                                        </span>
                                        <input
                                            value={methodForm.account_number}
                                            placeholder="e.g. 0917 123 1234"
                                            onChange={(e) => setMethodForm({ ...methodForm, account_number: e.target.value })}
                                            required
                                        />
                                    </label>
                                </div>

                                <div className="dl-field">
                                    <span>
                                        QR Code <Help text="Shown to donors next to the account details." />
                                    </span>
                                    <div className="dl-qr-box">
                                        <span className="dl-method-qr">
                                            {methodForm.qr_image_url && <img src={methodForm.qr_image_url} alt="QR code" />}
                                        </span>
                                        <span className="dl-method-info">
                                            <b>{uploadingQr ? "Uploading..." : qrFileName || "No QR code yet"}</b>
                                            <span>Upload JPG or PNG · shown to donors at checkout</span>
                                        </span>
                                        <label className="dl-btn small">
                                            {methodForm.qr_image_url ? "Replace" : "Upload"}
                                            <input type="file" accept="image/*" hidden disabled={uploadingQr} onChange={uploadQr} />
                                        </label>
                                    </div>
                                </div>

                                <label className="dl-field">
                                    <span>Instructions for Donors</span>
                                    <textarea
                                        rows="2"
                                        value={methodForm.instructions}
                                        placeholder="Send to the number above, then upload your screenshot receipt."
                                        onChange={(e) => setMethodForm({ ...methodForm, instructions: e.target.value })}
                                    />
                                </label>

                                {editingMethodId && (
                                <div className="dl-field">
                                    <span>
                                        Status <Help text="Inactive methods are hidden from donors." />
                                    </span>
                                    <div className="dl-seg is-half">
                                        {[true, false].map((value) => (
                                            <button
                                                type="button"
                                                key={String(value)}
                                                className={methodForm.is_active === value ? "on" : ""}
                                                onClick={() => setMethodForm({ ...methodForm, is_active: value })}
                                            >
                                                {value ? "Active" : "Inactive"}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                )}

                                {methodMessage && <p className={`gs-alert ${methodTone}`}>{methodMessage}</p>}

                                <div className="dl-pm-foot">
                                    {editingMethodId && isAdmin() ? (
                                        (() => {
                                            const used = methodUsage(methodForm.method_type);
                                            const current = methods.find((m) => m._id === editingMethodId);

                                            return (
                                                <button
                                                    type="button"
                                                    className="dl-link is-danger"
                                                    disabled={used > 0}
                                                    onClick={() => current && deleteMethod(current)}
                                                >
                                                    Delete method
                                                    {used > 0 && ` (unavailable: used by ${used} donation${used === 1 ? "" : "s"})`}
                                                </button>
                                            );
                                        })()
                                    ) : (
                                        <span />
                                    )}

                                    <div className="dl-form-actions">
                                        <button type="button" className="dl-btn" onClick={backToMethodList}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="dl-btn primary" disabled={savingMethod || uploadingQr}>
                                            {savingMethod ? "Saving..." : editingMethodId ? "Save Changes" : "Add Method"}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        )}
            </aside>
            </div>
        </section>
    );
}
