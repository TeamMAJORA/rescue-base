import { useState, useEffect } from "react";

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
};

export default function DonationCenter() {
    const [donation, setDonation] = useState(emptyDonation);
    const [submitting, setSubmitting] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [message, setMessage] = useState("");
    const token = localStorage.getItem("token");

    const savedUser = JSON.parse(
        localStorage.getItem("rescuebase_user") || "{}"
    );

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
                        Authorization: `Bearer ${token}`
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                setMessage(
                    data.message || "Failed to upload image."
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
                donationType: donation.category,
                itemName: donation.itemName,
                quantity: Number(
                    donation.quantity || 1
                ),
                notes: donation.description,
                status: "pending",
            };

            const response = await fetch(
                `${API}/api/donations`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },

                    body: JSON.stringify(payload),
                }
            );

            const data = await response.json();

            console.log("DONATION STATUS:", response.status);
            console.log("DONATION RESPONSE:", data);

            if (!response.ok || !data.success) {
                setMessage(
                    data.message ||
                    "Failed to submit donation."
                );

                return;
            }

            setDonation(emptyDonation);

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
                                setDonation({
                                    ...donation,
                                    category:
                                        event.target
                                            .value,
                                })
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
                            value={
                                donation.itemName
                            }
                            onChange={(event) =>
                                setDonation({
                                    ...donation,
                                    itemName:
                                        event.target
                                            .value,
                                })
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
                                value={
                                    donation.quantity
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDonation({
                                        ...donation,
                                        quantity:
                                            event
                                                .target
                                                .value,
                                    })
                                }
                                required
                            />
                        </label>

                        <label>
                            Unit

                            <select
                                value={
                                    donation.unit
                                }
                                onChange={(
                                    event
                                ) =>
                                    setDonation({
                                        ...donation,
                                        unit: event
                                            .target
                                            .value,
                                    })
                                }
                            >
                                {donationUnits.map(
                                    (unit) => (
                                        <option
                                            key={unit}
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
                                setDonation({
                                    ...donation,
                                    deliveryMethod:
                                        event.target.value,
                                })
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
                            value={donation.preferredDate}
                            onChange={(event) =>
                                setDonation({
                                    ...donation,
                                    preferredDate:
                                        event.target.value,
                                })
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
                                setDonation({
                                    ...donation,
                                    description:
                                        event.target.value,
                                })
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

            <section className="adopter-panel donation-info-panel">
                <div className="adopter-panel-heading">
                    <div>
                        <h2>Accepted Donations</h2>

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
                    <h3>Thank you ❤️</h3>

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
