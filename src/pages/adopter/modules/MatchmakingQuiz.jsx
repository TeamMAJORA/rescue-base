import {
    useMemo, useRef, useState
} from "react";
import { fireSideCannons } from "../../../utils/confetti";

const API = import.meta.env.VITE_BACKEND_URL;

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

// One question per screen. "section" decides the tracker stage and the chip.
// Values are the same ones the quiz already saves, so the backend is unchanged.
function levelOptions() {
    return [1, 2, 3, 4, 5].map((level) => ({
        value: level,
        label: factorLabels[level],
        note: `${level} out of 5`,
    }));
}

const QUESTIONS = [
    {
        section: "Home",
        name: "homeType",
        title: "What type of home do you live in?",
        hint: "Pick the one that best describes your home.",
        options: [
            { value: "House", label: "House", note: "Your own space, often with a yard" },
            { value: "Apartment", label: "Apartment", note: "A unit in a shared building" },
            { value: "Condominium", label: "Condominium", note: "A condo unit with building rules" },
            { value: "Boarding House", label: "Boarding House", note: "A rented room in a shared house" },
            { value: "Other", label: "Other", note: "Something not listed here" },
        ],
    },
    {
        section: "Home",
        name: "homeOwnership",
        title: "Do you own or rent your home?",
        hint: "Renters may need the owner's permission to keep pets.",
        options: [
            { value: "Owned", label: "I own my home", note: "I decide the house rules" },
            { value: "Rented with permission", label: "Renting, pets allowed", note: "My landlord said yes to pets" },
            { value: "Rented without confirmed permission", label: "Renting, not sure about pets", note: "I haven't confirmed with my landlord yet" },
        ],
    },
    {
        section: "Home",
        name: "hasChildren",
        title: "Are there children at home?",
        hint: "Some pets are calmer around kids than others.",
        options: [
            { value: "Yes", label: "Yes", note: "Children live with me or visit often" },
            { value: "No", label: "No", note: "No children at home" },
        ],
    },
    {
        section: "Home",
        name: "hasOtherPets",
        title: "Do you have other pets at home?",
        hint: "We will look for pets that get along with them.",
        options: [
            { value: "Yes", label: "Yes", note: "I already have a pet" },
            { value: "No", label: "No", note: "This would be my only pet" },
        ],
    },
    {
        section: "Home",
        name: "preferredPetType",
        title: "What kind of pet are you looking for?",
        hint: "You can still browse every pet later.",
        options: [
            { value: "Dog", label: "Dog", note: "Loyal and playful companions" },
            { value: "Cat", label: "Cat", note: "Independent and affectionate" },
            { value: "Any", label: "No preference", note: "Show me every match" },
        ],
    },
    {
        section: "Home",
        name: "preferredSize",
        title: "What size of pet fits your home?",
        hint: "Think about your space and how much you can carry.",
        options: [
            { value: "Small", label: "Small", note: "Good for small spaces" },
            { value: "Medium", label: "Medium", note: "A balance of size and space" },
            { value: "Large", label: "Large", note: "Needs more room and exercise" },
            { value: "Any", label: "No preference", note: "Any size is fine" },
        ],
    },
    {
        section: "Lifestyle",
        name: "petExperience",
        title: "How much experience do you have with pets?",
        hint: "Be honest, it helps us suggest the right pet.",
        options: [
            { value: "Beginner", label: "Beginner", note: "This would be my first pet" },
            { value: "Some experience", label: "Some experience", note: "I have cared for a pet before" },
            { value: "Experienced", label: "Experienced", note: "I have raised several pets" },
            { value: "Professional", label: "Professional", note: "I work with animals (vet, trainer, shelter)" },
        ],
    },
    {
        section: "Lifestyle",
        name: "dailyAvailableHours",
        title: "How much time can you give a pet each day?",
        hint: "Pick the one that fits most days.",
        options: [
            { value: "Less than 1", label: "Less than 1 hour", note: "Short visits and quick walks" },
            { value: "1-2", label: "1–2 hours", note: "A walk and some playtime" },
            { value: "2-4", label: "2–4 hours", note: "Regular play and training" },
            { value: "More than 4", label: "More than 4 hours", note: "Home most of the day" },
        ],
    },
    {
        section: "Lifestyle",
        name: "exerciseFrequency",
        title: "How active is your daily routine?",
        hint: "Active pets do best with active owners.",
        options: [
            { value: "Low", label: "Low", note: "Mostly relaxing at home" },
            { value: "Moderate", label: "Moderate", note: "Short walks most days" },
            { value: "High", label: "High", note: "Daily walks or outdoor time" },
            { value: "Very High", label: "Very High", note: "Running, hiking, lots of activity" },
        ],
    },
    {
        section: "Lifestyle",
        name: "willingToTrain",
        title: "Are you willing to train your pet?",
        hint: "Some pets still need help with basic manners.",
        options: [
            { value: "Yes", label: "Yes", note: "I will put in the time" },
            { value: "Maybe", label: "Maybe", note: "If the pet needs it" },
            { value: "No", label: "No", note: "I prefer a pet that is already trained" },
        ],
    },
    ...Object.keys(factorDescriptions).map((name) => ({
        section: "Preferences",
        name,
        title: factorDescriptions[name],
        hint:
            name === "anxietyTolerance" || name === "aggressionTolerance"
                ? "This is how much you can handle, not what you prefer."
                : "Choose the level that suits you best.",
        options: levelOptions(),
    })),
];

// One dash per section; each fills as you move through its questions
const SECTIONS = ["Home", "Lifestyle", "Preferences"].map((name) => ({
    name,
    start: QUESTIONS.findIndex((item) => item.section === name),
    count: QUESTIONS.filter((item) => item.section === name).length,
}));

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
        preferredPetType: savedQuiz?.preferredPetType || "",
        preferredSize: savedQuiz?.preferredSize || "",
        homeType: savedQuiz?.homeType || "",
        homeOwnership: savedQuiz?.homeOwnership || "",
        hasChildren: savedQuiz?.hasChildren || "",
        hasOtherPets: savedQuiz?.hasOtherPets || "",
        petExperience: savedQuiz?.petExperience || "",
        dailyAvailableHours: savedQuiz?.dailyAvailableHours || "",
        exerciseFrequency: savedQuiz?.exerciseFrequency || "",
        willingToTrain: savedQuiz?.willingToTrain || "",

        energyPreference: savedQuiz?.energyPreference || 1,
        friendlinessPreference: savedQuiz?.friendlinessPreference || 1,
        humanSociabilityPreference: savedQuiz?.humanSociabilityPreference || 1,
        animalSociabilityPreference: savedQuiz?.animalSociabilityPreference || 1,
        trainabilityPreference: savedQuiz?.trainabilityPreference || 1,
        anxietyTolerance: savedQuiz?.anxietyTolerance || 1,
        aggressionTolerance: savedQuiz?.aggressionTolerance || 1,
        activityPreference: savedQuiz?.activityPreference || 1,
    });

    const [questionIndex, setQuestionIndex] =
        useState(0);

    const [submitting, setSubmitting] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [messageType, setMessageType] =
        useState("");
    
    const [started, setStarted] = useState(false);
    const question = QUESTIONS[questionIndex];
    const isLastQuestion = questionIndex === QUESTIONS.length - 1;
    const answered = form[question.name] !== "";    

    function chooseAnswer(value) {
        setForm((currentForm) => ({
            ...currentForm,
            [question.name]: value,
        }));
    }

    const advanceTimer = useRef(null);

    // Option questions: save the answer, then move on after a short pause
    function pickOption(value) {
        chooseAnswer(value);
        window.clearTimeout(advanceTimer.current); // double-clicks only advance once
        advanceTimer.current = window.setTimeout(nextStep, 250);
    }

    function nextStep(event) {
        event?.preventDefault();

        setMessage("");
        setMessageType("");

        setQuestionIndex((current) =>
            Math.min(current + 1, QUESTIONS.length - 1)
        );
    }

    function previousStep() {
        window.clearTimeout(advanceTimer.current);
        setMessage("");
        setMessageType("");

        setQuestionIndex((current) =>
            Math.max(current - 1, 0)
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

            const response = await fetch(`${API}/api/matchmaking/quiz`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type" : "application/json",
                    },
                    body: JSON.stringify(quizResponse),
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || "Failed to process matchmaking quiz.");
            }

            localStorage.setItem("rescuebase_matchmaking_results", JSON.stringify(result));

            setMessageType("success");
            setMessage(
                "Your matchmaking preferences were saved successfully"
            );

            fireSideCannons(5000);

            window.setTimeout(() => {
                onCompleted?.(result);
            }, 400);

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

if (!started) {
    return (
        <section className="mq-intro">
            <img className="mq-intro-paw" src="/icons/heroPaw.svg" alt="" />

            <p className="mq-intro-brand">RescueBase</p>
            <img className="mq-intro-logo" src="/Logo.svg" alt="" />

            <h2>
                Find Your <span>Perfect Pet Match</span>
            </h2>

            <p className="mq-intro-text">
                Answer a few simple questions about your lifestyle, home, and
                preferences. Our smart matching system will recommend pets that
                are the perfect fit for you.
            </p>

            <button
                type="button"
                className="mq-intro-button"
                onClick={() => setStarted(true)}
            >
                Take the Quiz <span aria-hidden="true">→</span>
            </button>
        </section>
    );
}

    return (
        <section className="matchmaking-module">
            <div className="mq-top">
                <button
                    type="button"
                    className="mq-top-back"
                    onClick={questionIndex === 0 ? () => setStarted(false) : previousStep}
                    disabled={submitting}
                    aria-label={questionIndex === 0 ? "Back to intro" : "Previous question"}
                >
                    <img src="/icons/sidebar/return-brown.svg" alt="" />
                </button>

                <button
                    type="button"
                    className="mq-top-next"
                    onClick={nextStep}
                    disabled={isLastQuestion || !answered || submitting}
                    aria-label="Next question"
                >
                    <img src="/icons/sidebar/return-brown.svg" alt="" />
                </button>
            </div>

            <form
                className="matchmaking-form"
                onSubmit={handleSubmit}
            >
                <section className="mq-card" key={question.name}>
                    <span className="mq-card-chip">{question.section}</span>
                    <h3 className="mq-card-title">{question.title}</h3>
                    <p className="mq-card-hint">{question.hint}</p>

                    {question.section === "Preferences" ? (
                        <div className="mq-slider">
                            <div
                                className="mq-slider-value"
                                key={form[question.name]}
                            >
                                <b>{factorLabels[form[question.name]]}</b>
                                <small>{form[question.name]} out of 5</small>
                            </div>

                            <input
                                type="range"
                                min="1"
                                max="5"
                                step="1"
                                value={form[question.name]}
                                onChange={(event) => chooseAnswer(Number(event.target.value))}
                                aria-label={question.title}
                                aria-valuetext={factorLabels[form[question.name]]}
                                style={{
                                    "--fill": `${(form[question.name] - 1) * 25}%`,
                                    "--wiggle": `${[0, 4, 8, 13, 19, 26][form[question.name]]}deg`,
                                    "--wiggle-speed": `${[0, 1.2, 0.9, 0.7, 0.5, 0.32][form[question.name]]}s`,
                                    "--wiggle-bounce": form[question.name] === 5 ? 1.12 : 1,
                                }}
                            />

                            <div className="mq-slider-ticks">
                                {[1, 2, 3, 4, 5].map((level) => (
                                    <button
                                        key={level}
                                        type="button"
                                        className={level <= form[question.name] ? "is-on" : ""}
                                        onClick={() => chooseAnswer(level)}
                                    >
                                        <span aria-hidden="true" />
                                        {factorLabels[level]}
                                    </button>
                                ))}
                            </div>
                            
                            {!isLastQuestion && (
                                <button
                                    type="button"
                                    className="matchmaking-submit-button"
                                    onClick={nextStep}
                                >
                                    Confirm answer
                                </button>
                            )}
                        </div>
                    ) : (
                    <div
                        className="mq-options"
                        role="radiogroup"
                        aria-label={question.title}
                    >
                        {question.options.map((option) => {
                            const selected = form[question.name] === option.value;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={selected}
                                    className={`mq-option ${selected ? "is-selected" : ""}`}
                                    onClick={() => pickOption(option.value)}
                                >
                                    <span className="mq-option-dot" aria-hidden="true">
                                        {selected && <img src="/icons/checkmark.svg" alt="" />}
                                    </span>
                                    <span className="mq-option-text">
                                        <b>{option.label}</b>
                                        <small>{option.note}</small>
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                    )}
                </section>

                {message && (
                    <div
                        className={`matchmaking-message ${messageType}`}
                    >
                        {message}
                    </div>
                )}

                {isLastQuestion && (
                    <div className="matchmaking-actions">
                        <button
                            type="submit"
                            className="matchmaking-submit-button"
                            disabled={submitting}
                        >
                            {submitting ? "Saving Preferences..." : "Complete Matchmaking Quiz"}
                        </button>
                    </div>
                )}          
            </form>
            <div
                className="mq-dashes"
                role="progressbar"
                aria-label={`Question ${questionIndex + 1} of ${QUESTIONS.length}`}
                aria-valuemin={1}
                aria-valuemax={QUESTIONS.length}
                aria-valuenow={questionIndex + 1}
            >
                {SECTIONS.map((section) => {
                    const done = (questionIndex - section.start + 1) / section.count;

                    return (
                        <span key={section.name}>
                            <i style={{ width: `${Math.min(Math.max(done, 0), 1) * 100}%` }} />
                        </span>
                    );
                })}
            </div>        
        </section>
    );
}

