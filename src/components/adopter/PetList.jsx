import { useEffect, useMemo, useState } from "react";
import BrowsePetCard from "./BrowsePetCard";
import LoadingState from "../system/LoadingState";
import Icon from "../system/Icon";
import { useSavedPets } from "../../utils/savedPets";
import QrScanDialog from "../system/QrScanDialog";
import { TAG_CODE_PATTERN, lookupAnimalByTag, tagCodeFrom } from "../../utils/qrTag";
import { getAnimalStatus } from "../../utils/petStatus";

const STATUS_PILLS = [
    { key: "all", label: "All pets" },
    { key: "available", label: "Available" },
    { key: "in_foster", label: "In foster" },
    { key: "saved", label: "Saved" },
];

function getSortTime(pet) {
    const time = new Date(pet.createdAt || pet.intakeDate || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
}

export default function PetList({
    className = "",
    id,
    title = "Who's stealing your heart today?",
    subtitle = "Pick a pal below to peek at their story and apply today.",
    loading,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    filteredPets = [],
    pets = [],
    selectedPet,
    setSelectedPet,
    onRefresh,
    initialStatusFilter = "all",
}) {
    const selectedId = selectedPet?._id;

    const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
    const [sortBy, setSortBy] = useState("newest");
    const { savedIds, toggleSaved } = useSavedPets();
    const [qrScanning, setQrScanning] = useState(false);
    // A full tag code (or pasted /pet/RB-… link) in the search box shows only that pet
    const searchedTagCode = TAG_CODE_PATTERN.test(tagCodeFrom(search)) ? tagCodeFrom(search) : "";
    const [tagMatch, setTagMatch] = useState({ tagCode: "", animalId: null });

    useEffect(() => {
        if (!searchedTagCode) return undefined;
        let cancelled = false;
        lookupAnimalByTag(searchedTagCode)
            .then((animal) => !cancelled && setTagMatch({ tagCode: searchedTagCode, animalId: animal?._id || null }))
            .catch(() => !cancelled && setTagMatch({ tagCode: searchedTagCode, animalId: null }));
        return () => { cancelled = true; };
    }, [searchedTagCode]);

    async function openPetFromScan(scannedText) {
        const tagCode = tagCodeFrom(scannedText);
        const animal = await lookupAnimalByTag(tagCode);
        if (!animal) return `No pet has tag "${tagCode}".`;

        const listedPet = pets.find((pet) => pet._id === animal._id);
        if (listedPet) {
            setQrScanning(false);
            setSelectedPet(listedPet);
            return undefined;
        }
        const status = getAnimalStatus(animal);
        return {
            message: `${animal.name} isn't up for adoption right now (${status[0].toUpperCase()}${status.slice(1)}). You can still see the public page with the shelter's contact.`,
            linkLabel: "View public page",
            linkHref: `/pet/${encodeURIComponent(tagCode)}`,
        };
    }

    const visiblePets = useMemo(() => {
        const searchedPets = searchedTagCode
            ? pets.filter((pet) => tagMatch.tagCode === searchedTagCode && pet._id === tagMatch.animalId)
            : filteredPets;
        const list = searchedPets.filter((pet) => {
            if (statusFilter === "available") return pet.fosterStatus !== "in_foster";
            if (statusFilter === "in_foster") return pet.fosterStatus === "in_foster";
            if (statusFilter === "saved") return savedIds.includes(pet._id);
            return true;
        });

        return [...list].sort((a, b) => {
            if (sortBy === "name") return String(a.name || "").localeCompare(String(b.name || ""));
            if (sortBy === "oldest") return getSortTime(a) - getSortTime(b);
            return getSortTime(b) - getSortTime(a);
        });
    }, [filteredPets, pets, searchedTagCode, tagMatch, statusFilter, sortBy, savedIds]);

    return (
        <section className={className} id={id}>
            <div className="browse-pets-panel-heading">
                <div>
                    <h3>{title}</h3>
                    <p>{subtitle}</p>
                </div>
            </div>

            <div className="pet-list-toolbar">
                <input
                    type="search"
                    className="pet-list-search"
                    aria-label="Search pets"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search pet name, breed, type, or QR code"
                />

                <button type="button" className="ao-btn pet-list-scan" onClick={() => setQrScanning(true)}>
                    <Icon name="qr" /> Scan QR
                </button>

                <select
                    className="pet-list-select"
                    aria-label="Species"
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                >
                    <option value="all">Species: All</option>
                    <option value="dog">Species: Dogs</option>
                    <option value="cat">Species: Cats</option>
                </select>

                <select
                    className="pet-list-select"
                    aria-label="Sort pets"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                >
                    <option value="newest">Sort: Newest</option>
                    <option value="oldest">Sort: Oldest</option>
                    <option value="name">Sort: Name A–Z</option>
                </select>
            </div>

            <div className="pet-list-pills-row">
                <div className="pet-list-pills" role="group" aria-label="Filter pets">
                    {STATUS_PILLS.map((pill) => (
                        <button
                            key={pill.key}
                            type="button"
                            className={statusFilter === pill.key ? "active" : ""}
                            aria-pressed={statusFilter === pill.key}
                            onClick={() => setStatusFilter(pill.key)}
                        >
                            {pill.label}
                        </button>
                    ))}
                </div>

                {!loading && !error && (
                    <span className="pet-list-count">
                        {visiblePets.length} {visiblePets.length === 1 ? "pet" : "pets"}
                    </span>
                )}
            </div>

            <div className="browse-pets-list">
                {loading && (
                    <>
                        {[0, 1, 2].map((index) => (
                            <article
                                key={`skeleton-${index}`}
                                className="browse-pet-card adopter-skeleton-card"
                                aria-hidden="true"
                            >
                                <div className="browse-pet-card-image adopter-skeleton" />

                                <div className="browse-pet-card-content">
                                    <div className="adopter-skeleton adopter-skeleton-line short" />
                                    <div className="adopter-skeleton adopter-skeleton-line" />
                                    <div className="adopter-skeleton adopter-skeleton-pill" />
                                </div>
                            </article>
                        ))}

                        <LoadingState label="Finding pets for you…" />
                    </>
                )}

                {!loading && error && (
                    <div className="browse-pets-message error">
                        <span>!</span>
                        <p>{error}</p>
                        <button type="button" onClick={() => onRefresh?.()}>
                            Try again
                        </button>
                    </div>
                )}

                {!loading && !error && visiblePets.length === 0 && (
                    <div className="browse-pets-message">
                        <span>
                            <img src="/icons/logoPlaceholder.svg" alt="" />
                        </span>
                        <p>
                            {statusFilter === "saved"
                                ? "You don't have any saved pets yet. Tap the heart on any pet to add them to your favorites!"
                                : "No available animals match your search."}
                        </p>
                    </div>
                )}

                {!loading &&
                    !error &&
                    visiblePets.map((pet) => {
                        const isSelected = selectedId === pet._id;
                        const isSaved = savedIds.includes(pet._id);

                        return (
                            <BrowsePetCard
                                key={pet._id}
                                pet={pet}
                                className={isSelected ? "active" : ""}
                                viewLabel={isSelected ? "Viewing profile" : "View full profile"}
                                onClick={() => setSelectedPet(pet)}
                                onView={setSelectedPet}
                            >
                                <button
                                    type="button"
                                    className={`pet-card-save${isSaved ? " saved" : ""}`}
                                    aria-pressed={isSaved}
                                    aria-label={isSaved ? `Remove ${pet.name} from saved` : `Save ${pet.name}`}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        toggleSaved(pet._id);
                                    }}
                                >
                                    <Icon name="heart" filled={isSaved} />
                                </button>
                            </BrowsePetCard>
                        );
                    })}
            </div>
            {qrScanning && <QrScanDialog onScan={openPetFromScan} onClose={() => setQrScanning(false)} />}
        </section>
    );
}