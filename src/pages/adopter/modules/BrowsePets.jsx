import PetList from "../../../components/adopter/PetList";
import PetDetailPanel from "../../../components/adopter/PetDetailPanel";

export default function BrowsePets({
    pets,
    loading,
    error,
    search,
    setSearch,
    typeFilter,
    setTypeFilter,
    filteredPets,
    selectedPet,
    setSelectedPet,
    hasPendingApplication,
    applicationStatus,
    onApply,
    onRefresh,
}) {

    return (
        <section className="browse-pets-module">

            {hasPendingApplication && (
                <section className="browse-pets-pending-banner">
                    <div>
                        <span>Pending Application</span>

                        <h3>
                            You already applied for{" "}
                            {applicationStatus?.petName || "an animal"}
                        </h3>

                        <p>
                            You can continue browsing, but another application
                            cannot be submitted until the shelter finishes its
                            review.
                        </p>
                    </div>

                    {applicationStatus?.petImage && (
                        <img
                            src={applicationStatus.petImage}
                            alt={applicationStatus.petName || "Applied animal"}
                        />
                    )}
                </section>
            )}

            <div className="browse-pets-layout">
                <PetList
                    className="browse-pets-list-panel"
                    loading={loading}
                    error={error}
                    search={search}
                    setSearch={setSearch}
                    typeFilter={typeFilter}
                    setTypeFilter={setTypeFilter}
                    filteredPets={filteredPets}
                    selectedPet={selectedPet}
                    setSelectedPet={setSelectedPet}
                    onRefresh={onRefresh}
                />

                <PetDetailPanel
                    className="browse-pet-details-panel"
                    pet={selectedPet}
                    hasPendingApplication={hasPendingApplication}
                    applicationStatus={applicationStatus}
                    onApply={onApply}
                />
            </div>
        </section>
    );
}