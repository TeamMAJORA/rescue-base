import {
    useMemo, useState
} from "react";

const factorDescriptions = {
    energyPreference:
        "How energetic should your preferred pet be?",
    friendlinessPreference:
        "How friendly should your preferred pet be toward people?",
    humanSociabilityPreference:
        "How much should the pet enjoy spending time with people?",
    animalSociabilityPreference:
        "How comfortable should the pet be around other animals?",
    trainabilityPreference:
        "How responsive should the pet be to training?",
    anxietyTolerance:
        "How prepared are you to care for a pet with anxiety?",
    aggressionTolerance:
        "How prepared are you to manage challenging or aggressive behavior?",
    activityPreference:
        "How active should the pet be during the day?",
};

const factorLabels = {
    1: "Very Low",
    2: "Low",
    3: "Moderate",
    4: "High",
    5: "Very High",
};

function getSavedQuiz() {
    try {
        return JSON.parse(
            localStorage.getItem(
                "rescuebase_matchmaking_quiz"
            ) || "null"
        );
    } catch {
        return null;
    }
}

export default function MatchmakingQuiz({
    user,
    onCompleted,
}) {
    const savedQuiz = useMemo(
        () => getSavedQuiz(),
        []
    );

    const [form, setForm] = useState({
        preferredPetType:
            savedQuiz?.preferredPetType || "Any",

        preferredSize:
            savedQuiz?.preferredSize || "Any",

        homeType:
            savedQuiz?.homeType || "House",

        homeOwnership:
            savedQuiz?.homeOwnership || "Owned",

        hasChildren:
            savedQuiz?.hasChildren || "No",

        hasOtherPets:
            savedQuiz?.hasOtherPets || "No",

        petExperience:
            savedQuiz?.petExperience || "Beginner",

        dailyAvailableHours:
            savedQuiz?.dailyAvailableHours || "2-4",

        exerciseFrequency:
            savedQuiz?.exerciseFrequency || "Moderate",

        willingToTrain:
            savedQuiz?.willingToTrain || "Yes",

        energyPreference:
            savedQuiz?.energyPreference || 3,

        friendlinessPreference:
            savedQuiz?.friendlinessPreference || 3,

        humanSociabilityPreference:
            savedQuiz?.humanSociabilityPreference || 3,

        animalSociabilityPreference:
            savedQuiz?.animalSociabilityPreference || 3,

        trainabilityPreference:
            savedQuiz?.trainabilityPreference || 3,

        anxietyTolerance:
            savedQuiz?.anxietyTolerance || 3,

        aggressionTolerance:
            savedQuiz?.aggressionTolerance || 1,

        activityPreference:
            savedQuiz?.activityPreference || 3,
    });

    const [currentStep, setCurrentStep] =
        useState(1);

    const [submitting, setSubmitting] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [messageType, setMessageType] =
        useState("");

    const totalSteps = 3;

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((currentForm) => ({
            ...currentForm,
            [name]:
                event.target.type === "range"
                    ? Number(value)
                    : value,
        }));
    }

    function nextStep(event) {
        event?.preventDefault();

        setMessage("");
        setMessageType("");

        setCurrentStep((current) =>
            Math.min(current + 1, totalSteps)
        );
    }
    function previousStep() {
        setMessage("");
        setMessageType("");

        setCurrentStep((current) =>
            Math.max(current - 1, 1)
        );
    }

    async function handleSubmit(event) {
        event.preventDefault();

        try {
            setSubmitting(true);
            setMessage("");
            setMessageType("");

            const quizResponse = {
                adopterUserId:
                    user?._id || null,

                adopterName:
                    user?.name ||
                    user?.username ||
                    "Adopter",

                adopterEmail:
                    String(user?.email || "")
                        .trim()
                        .toLowerCase(),

                ...form,

                completedAt:
                    new Date().toISOString(),
            };

            localStorage.setItem(
                "rescuebase_matchmaking_quiz",
                JSON.stringify(quizResponse)
            );

            setMessageType("success");
            setMessage(
                "Your matchmaking preferences were saved successfully"
            );

            window.setTimeout(() => {
                onCompleted?.(quizResponse);
            }, 900);

        } catch (error) {
            console.error(
                "Save matchmaking quiz error:",
                error
            );

            setMessageType("error");
            setMessage(
                "Failed to save your matchmaking preferences."
            );
        } finally {
            setSubmitting(false);
        }
    }

    function renderFactorSlider(name) {
        const value = Number(form[name] || 1);

        return (
            <article
                className="matchmaking-factor-card"
                key={name}
            >
                <div className="matchmaking-factor-heading">
                    <div>
                        <h3>
                            {
                                factorDescriptions[
                                name
                                ]
                            }
                        </h3>

                        <p>
                            Choose a score from 1 to 5.
                        </p>
                    </div>

                    <span>
                        {value} —{" "}
                        {factorLabels[value]}
                    </span>
                </div>

                <input
                    type="range"
                    name={name}
                    min="1"
                    max="5"
                    step="1"
                    value={value}
                    onChange={handleChange}
                />

                <div className="matchmaking-range-labels">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                </div>
            </article>
        );
    }

    return (
        <section className="matchmaking-module">
            <header className="matchmaking-header">
                <div>
                    <span>
                        Behavioral Matching
                    </span>

                    <h2>
                        Find Your Best Pet Match
                    </h2>

                    <p>
                        Tell RescueBase about your home,
                        lifestyle, experience, and preferred
                        animal behavior.
                    </p>
                </div>

                <div className="matchmaking-progress-summary">
                    <span>
                        Step {currentStep} of{" "}
                        {totalSteps}
                    </span>

                    <strong>
                        {Math.round(
                            (currentStep /
                                totalSteps) *
                            100
                        )}
                        %
                    </strong>
                </div>
            </header>

            <div className="matchmaking-progress-bar">
                <div
                    style={{
                        width: `${(currentStep /
                            totalSteps) *
                            100
                            }%`,
                    }}
                />
            </div>

            <form
                className="matchmaking-form"
                onSubmit={handleSubmit}
            >
                {currentStep === 1 && (
                    <section className="matchmaking-step">
                        <div className="matchmaking-step-heading">
                            <span>Step 1</span>

                            <h3>
                                Home and Household
                            </h3>

                            <p>
                                These details help determine
                                whether an animal can safely
                                and comfortably live in your
                                home.
                            </p>
                        </div>

                        <div className="matchmaking-grid">
                            <label>
                                Preferred Pet Type

                                <select
                                    name="preferredPetType"
                                    value={
                                        form.preferredPetType
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="Any">
                                        Any
                                    </option>

                                    <option value="Dog">
                                        Dog
                                    </option>

                                    <option value="Cat">
                                        Cat
                                    </option>

                                    <option value="Other">
                                        Other
                                    </option>
                                </select>
                            </label>

                            <label>
                                Preferred Pet Size

                                <select
                                    name="preferredSize"
                                    value={
                                        form.preferredSize
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="Any">
                                        Any
                                    </option>

                                    <option value="Small">
                                        Small
                                    </option>

                                    <option value="Medium">
                                        Medium
                                    </option>

                                    <option value="Large">
                                        Large
                                    </option>
                                </select>
                            </label>

                            <label>
                                Home Type

                                <select
                                    name="homeType"
                                    value={
                                        form.homeType
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="House">
                                        House
                                    </option>

                                    <option value="Apartment">
                                        Apartment
                                    </option>

                                    <option value="Condominium">
                                        Condominium
                                    </option>

                                    <option value="Boarding House">
                                        Boarding House
                                    </option>

                                    <option value="Other">
                                        Other
                                    </option>
                                </select>
                            </label>

                            <label>
                                Home Ownership

                                <select
                                    name="homeOwnership"
                                    value={
                                        form.homeOwnership
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="Owned">
                                        Owned
                                    </option>

                                    <option value="Rented with permission">
                                        Rented with permission
                                    </option>

                                    <option value="Rented without confirmed permission">
                                        Rented without
                                        confirmed permission
                                    </option>
                                </select>
                            </label>

                            <label>
                                Children at Home

                                <select
                                    name="hasChildren"
                                    value={
                                        form.hasChildren
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="No">
                                        No
                                    </option>

                                    <option value="Yes">
                                        Yes
                                    </option>
                                </select>
                            </label>

                            <label>
                                Other Pets at Home

                                <select
                                    name="hasOtherPets"
                                    value={
                                        form.hasOtherPets
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="No">
                                        No
                                    </option>

                                    <option value="Yes">
                                        Yes
                                    </option>
                                </select>
                            </label>
                        </div>
                    </section>
                )}

                {currentStep === 2 && (
                    <section className="matchmaking-step">
                        <div className="matchmaking-step-heading">
                            <span>Step 2</span>

                            <h3>
                                Lifestyle and Experience
                            </h3>

                            <p>
                                Your schedule and animal-care
                                experience affect which pets
                                are most suitable for you.
                            </p>
                        </div>

                        <div className="matchmaking-grid">
                            <label>
                                Pet-Care Experience

                                <select
                                    name="petExperience"
                                    value={
                                        form.petExperience
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="Beginner">
                                        Beginner
                                    </option>

                                    <option value="Some experience">
                                        Some experience
                                    </option>

                                    <option value="Experienced">
                                        Experienced
                                    </option>

                                    <option value="Professional">
                                        Professional
                                    </option>
                                </select>
                            </label>

                            <label>
                                Daily Time Available

                                <select
                                    name="dailyAvailableHours"
                                    value={
                                        form.dailyAvailableHours
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="Less than 1">
                                        Less than 1 hour
                                    </option>

                                    <option value="1-2">
                                        1–2 hours
                                    </option>

                                    <option value="2-4">
                                        2–4 hours
                                    </option>

                                    <option value="More than 4">
                                        More than 4 hours
                                    </option>
                                </select>
                            </label>

                            <label>
                                Exercise Frequency

                                <select
                                    name="exerciseFrequency"
                                    value={
                                        form.exerciseFrequency
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="Low">
                                        Low
                                    </option>

                                    <option value="Moderate">
                                        Moderate
                                    </option>

                                    <option value="High">
                                        High
                                    </option>

                                    <option value="Very High">
                                        Very High
                                    </option>
                                </select>
                            </label>

                            <label>
                                Willing to Provide Training

                                <select
                                    name="willingToTrain"
                                    value={
                                        form.willingToTrain
                                    }
                                    onChange={
                                        handleChange
                                    }
                                >
                                    <option value="Yes">
                                        Yes
                                    </option>

                                    <option value="Maybe">
                                        Maybe
                                    </option>

                                    <option value="No">
                                        No
                                    </option>
                                </select>
                            </label>
                        </div>

                        <div className="matchmaking-information-box">
                            <strong>
                                Why RescueBase asks this
                            </strong>

                            <p>
                                Animals with higher energy,
                                anxiety, training, or activity
                                needs may require additional
                                time and experience from their
                                adopter.
                            </p>
                        </div>
                    </section>
                )}

                {currentStep === 3 && (
                    <section className="matchmaking-step">
                        <div className="matchmaking-step-heading">
                            <span>Step 3</span>

                            <h3>
                                Behavioral Preferences
                            </h3>

                            <p>
                                Choose your preferred level
                                or tolerance for each animal
                                behavioral factor.
                            </p>
                        </div>

                        <div className="matchmaking-factor-list">
                            {renderFactorSlider(
                                "energyPreference"
                            )}

                            {renderFactorSlider(
                                "friendlinessPreference"
                            )}

                            {renderFactorSlider(
                                "humanSociabilityPreference"
                            )}

                            {renderFactorSlider(
                                "animalSociabilityPreference"
                            )}

                            {renderFactorSlider(
                                "trainabilityPreference"
                            )}

                            {renderFactorSlider(
                                "anxietyTolerance"
                            )}

                            {renderFactorSlider(
                                "aggressionTolerance"
                            )}

                            {renderFactorSlider(
                                "activityPreference"
                            )}
                        </div>

                        <div className="matchmaking-warning-box">
                            <strong>
                                Important
                            </strong>

                            <p>
                                A higher anxiety or aggression
                                tolerance means you are more
                                prepared to manage those
                                behaviors. It does not mean
                                you prefer an anxious or
                                aggressive animal.
                            </p>
                        </div>
                    </section>
                )}

                {message && (
                    <div
                        className={`matchmaking-message ${messageType}`}
                    >
                        {message}
                    </div>
                )}

                <div className="matchmaking-actions">
                    <button
                        type="button"
                        className="matchmaking-back-button"
                        onClick={previousStep}
                        disabled={currentStep === 1 || submitting}
                    >
                        Previous
                    </button>

                    {currentStep < totalSteps ? (
                        <button
                            key={`continue-step-${currentStep}`}
                            type="button"
                            className="matchmaking-next-button"
                            onClick={nextStep}
                            disabled={submitting}
                        >
                            Continue
                        </button>
                    ) : (
                        <button
                            key="complete-matchmaking-quiz"
                            type="submit"
                            className="matchmaking-submit-button"
                            disabled={submitting}
                        >
                            {submitting
                                ? "Saving Preferences..."
                                : "Complete Matchmaking Quiz"}
                        </button>
                    )}
                </div>
            </form>
        </section>
    );
}