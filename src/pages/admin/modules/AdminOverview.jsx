import { useCallback, useEffect, useMemo, useState } from "react";
import "../../../styles/admin/AdminDashboardOverview.css";

const API = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/+$/, "");
const REFRESH_MS = 60000;
const MONTHS_SHOWN = 6;

const FOOD_LOW_DAYS = 5;
const FOOD_ITEMS_SHOWN = 4;

// Which animals eat a food item, guessed from its name ("Dog food adult" -> dogs)
function foodSpeciesOf(name) {
    const text = String(name || "").toLowerCase();
    if (/\b(dog|puppy|puppies)\b/.test(text)) return "Dog";
    if (/\b(cat|kitten|kittens)\b/.test(text)) return "Cat";
    return "";
}

// Real stock from Food Storage: days left at the current headcount, lowest first
function buildFoodLevels(inventory, animalsInCare) {
    return inventory
        .map((item) => {
            const species = foodSpeciesOf(item.name);
            const eaters = species
                ? animalsInCare.filter((animal) => animal.type === species).length
                : animalsInCare.length;
            const stockKg = Number(item.quantityInStock) || 0;
            const dailyKg = eaters * (Number(item.foodRatePerAnimalPerDay) || 0);
            const targetDays = Number(item.forecastDays) || 30;
            const daysLeft = dailyKg > 0 ? Math.floor(stockKg / dailyKg) : null;

            return {
                id: item._id,
                name: item.name,
                species,
                eaters,
                stockKg,
                daysLeft,
                targetDays,
                coverage: daysLeft === null ? 100 : Math.min(100, (daysLeft / targetDays) * 100),
                isLow: daysLeft !== null && daysLeft <= FOOD_LOW_DAYS,
            };
        })
        .sort((a, b) => (a.daysLeft ?? Infinity) - (b.daysLeft ?? Infinity));
}

const HEALTH_GROUPS = [
    { key: "healthy", label: "Healthy", color: "#2e9e4f" },
    { key: "observation", label: "Under observation", color: "#4a90d9" },
    { key: "sick", label: "Sick / injured", color: "#e5534b" },
    { key: "unknown", label: "Unknown", color: "#c9b48f" },
];

const STATUS_GROUPS = [
    { key: "available", label: "Available" },
    { key: "pending", label: "Pending" },
    { key: "fostered", label: "Fostered" },
    { key: "adopted", label: "Adopted" },
];

// ---------- helpers ----------

function authHeaders() {
    return { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
}

async function getJson(path) {
    const response = await fetch(`${API}${path}`, { headers: authHeaders() });
    if (!response.ok) throw new Error(`${path} ${response.status}`);
    return response.json();
}

function savedUser() {
    try {
        return JSON.parse(localStorage.getItem("rescuebase_user") || "{}") || {};
    } catch {
        return {};
    }
}

function greeting(date) {
    const hour = date.getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}

function animalStatus(animal) {
    if (animal.adoptionStatus === "adopted") return "adopted";
    if (animal.fosterStatus === "in_foster") return "fostered";
    if (animal.adoptionStatus === "pending") return "pending";
    if (animal.availabilityStatus === "available") return "available";
    return "unavailable";
}

function healthGroup(animal) {
    const condition = String(animal.intakeCondition || "").toLowerCase();
    if (condition === "healthy") return "healthy";
    if (condition === "under observation") return "observation";
    if (condition === "sick" || condition === "injured") return "sick";
    return "unknown";
}

function monthKey(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${d.getMonth()}`;
}

function lastMonths(count, now = new Date()) {
    return Array.from({ length: count }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
        return {
            key: monthKey(d),
            short: d.toLocaleDateString("en-US", { month: "short" }),
            long: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        };
    });
}

function shortDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(date, nowMs) {
    if (!date) return "";
    const minutes = Math.round((nowMs - new Date(date).getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
    return shortDate(date);
}

function namesLine(list, max = 5) {
    if (list.length === 0) return "None";
    const shown = list.slice(0, max).join(", ");
    return list.length > max ? `${shown} +${list.length - max}` : shown;
}

const PET_FALLBACK_ICON = "/icons/brown paw.svg";

// Activity Log type -> existing sidebar/app icon
const ACTIVITY_ICONS = {
    Adoption: "/icons/heart-brown.svg",
    Animal: "/icons/brown paw.svg",
    Medical: "/icons/medical-brown.svg",
    Vaccination: "/icons/vaccination-brown.svg",
    Foster: "/icons/home.svg",
    Donation: "/icons/donation-brown.svg",
    "Lost & Found": "/icons/LostnFound-brown.svg",
    Feedback: "/icons/Feedback.svg",
    Account: "/icons/User-brown.svg",
    Report: "/icons/clipboard-brown.svg",
};

function activityIcon(type) {
    return ACTIVITY_ICONS[type] || "/icons/sidebar/history.svg";
}

// ---------- small UI pieces ----------

function Tip({ tip }) {
    if (!tip) return null;
    return (
        <div className="db2-tip" style={{ left: tip.x, top: tip.y }}>
            <b>{tip.title}</b>
            {tip.lines.map((line) => (
                <span key={line}>{line}</span>
            ))}
        </div>
    );
}

// Show a tooltip at the mouse position inside the card
function useTip() {
    const [tip, setTip] = useState(null);

    const show = useCallback((event, title, lines) => {
        const card = event.currentTarget.closest(".db2-card");
        if (!card) return;
        const box = card.getBoundingClientRect();
        setTip({
            x: Math.min(event.clientX - box.left + 12, box.width - 220),
            y: event.clientY - box.top + 12,
            title,
            lines,
        });
    }, []);

    const hide = useCallback(() => setTip(null), []);
    return { tip, show, hide };
}

function StatCard({ hero, icon, badge, badgeClass, label, value, note }) {
    return (
        <div className={`db2-stat${hero ? " is-hero" : ""}`}>
            <div className="db2-stat-top">
                <img className="db2-stat-svg" src={icon} alt="" aria-hidden="true" />
                {badge && <span className={`db2-badge ${badgeClass || ""}`}>{badge}</span>}
            </div>
            <small>{label}</small>
            <b>{value}</b>
            {note && <em>{note}</em>}
        </div>
    );
}

// ---------- charts ----------

function LineChart({ months, intakes, adoptions, forecast }) {
    const { tip, show, hide } = useTip();
    const width = 640;
    const height = 230;
    const left = 36;
    const right = 20;
    const top = 16;
    const bottom = 34;
    const slots = months.length + (forecast != null ? 1 : 0);
    const maxValue = Math.max(4, ...intakes.map((m) => m.count), ...adoptions.map((m) => m.count), forecast || 0);
    const niceMax = Math.ceil(maxValue / 2) * 2;
    const x = (i) => left + ((width - left - right) / Math.max(1, slots - 1)) * i;
    const y = (v) => top + (height - top - bottom) * (1 - v / niceMax);
    const path = (list) => list.map((m, i) => `${i === 0 ? "M" : "L"}${x(i)} ${y(m.count)}`).join(" ");
    const ticks = [0, niceMax / 2, niceMax];

    return (
        <div className="db2-chart" onMouseLeave={hide}>
            <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label="Intakes and adoptions per month">
                {ticks.map((t) => (
                    <g key={t}>
                        <line x1={left} x2={width - right} y1={y(t)} y2={y(t)} stroke="#efe4cb" />
                        <text x={left - 10} y={y(t) + 4} textAnchor="end">{t}</text>
                    </g>
                ))}
                {months.map((m, i) => (
                    <text key={m.key} x={x(i)} y={height - 12} textAnchor="middle">{m.short}</text>
                ))}
                {forecast != null && (
                    <>
                        <text x={x(months.length)} y={height - 12} textAnchor="middle">Next</text>
                        <path
                            d={`M${x(months.length - 1)} ${y(intakes[intakes.length - 1].count)} L${x(months.length)} ${y(forecast)}`}
                            stroke="#c9b48f"
                            strokeWidth="3"
                            strokeDasharray="6 5"
                            fill="none"
                        />
                    </>
                )}
                <path d={path(intakes)} stroke="#fb8500" strokeWidth="3" fill="none" />
                <path d={path(adoptions)} stroke="#2e9e4f" strokeWidth="3" fill="none" />

                {months.map((m, i) => (
                    <g key={`hit-${m.key}`}>
                        <circle cx={x(i)} cy={y(intakes[i].count)} r="4.5" fill="#fb8500" />
                        <circle cx={x(i)} cy={y(adoptions[i].count)} r="4.5" fill="#2e9e4f" />
                        <rect
                            x={x(i) - 24}
                            y={top}
                            width="48"
                            height={height - top - bottom}
                            fill="transparent"
                            onMouseMove={(event) =>
                                show(event, m.long, [
                                    `${intakes[i].count} intakes · ${adoptions[i].count} adoptions`,
                                    `Came in: ${namesLine(intakes[i].names, 4)}`,
                                    `Went home: ${namesLine(adoptions[i].names, 4)}`,
                                ])
                            }
                        />
                    </g>
                ))}
                {forecast != null && (
                    <g>
                        <circle cx={x(months.length)} cy={y(forecast)} r="5" fill="#fff" stroke="#c9b48f" strokeWidth="3" />
                        <rect
                            x={x(months.length) - 24}
                            y={top}
                            width="48"
                            height={height - top - bottom}
                            fill="transparent"
                            onMouseMove={(event) =>
                                show(event, "Next month (AI forecast)", [`About ${forecast} new intakes expected`, "An estimate, not a guarantee"])
                            }
                        />
                    </g>
                )}
            </svg>
            <Tip tip={tip} />
        </div>
    );
}

function HealthDonut({ groups, total }) {
    const { tip, show, hide } = useTip();
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const healthy = groups.find((g) => g.key === "healthy")?.animals.length || 0;
    const percent = total ? Math.round((healthy / total) * 100) : 0;
    // Start position of each slice around the ring
    const slices = groups.reduce((list, g) => {
        const start = list.length ? list[list.length - 1].start + list[list.length - 1].length : 0;
        const length = total ? (g.animals.length / total) * circumference : 0;
        return [...list, { ...g, start, length }];
    }, []);

    return (
        <div className="db2-chart db2-donut-wrap" onMouseLeave={hide}>
            <svg viewBox="0 0 160 160" width="170" height="170" role="img" aria-label="Animals health">
                <circle cx="80" cy="80" r={radius} fill="none" stroke="#efe4cb" strokeWidth="26" />
                <g transform="rotate(-90 80 80)">
                    {slices
                        .filter((g) => g.length > 0)
                        .map((g) => (
                            <circle
                                key={g.key}
                                className="db2-slice"
                                cx="80"
                                cy="80"
                                r={radius}
                                fill="none"
                                stroke={g.color}
                                strokeWidth="26"
                                strokeDasharray={`${g.length} ${circumference}`}
                                strokeDashoffset={-g.start}
                                onMouseMove={(event) =>
                                    show(event, `${g.label} · ${g.animals.length}`, g.animals.slice(0, 6).map((a) => a.line))
                                }
                            />
                        ))}
                </g>
                <text x="80" y="80" textAnchor="middle" className="db2-donut-big">{percent}%</text>
                <text x="80" y="98" textAnchor="middle">healthy</text>
            </svg>
            <Tip tip={tip} />
        </div>
    );
}

// ---------- Loading skeleton (same shape as the real dashboard) ----------
function Bone({ w = "100%", h = 12, r, style }) {
    return <span className="db2-bone" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function SkeletonCard({ children, titleWidth = "40%" }) {
    return (
        <section className="db2-card db2-skel-card">
            <Bone w={titleWidth} h={16} />
            <Bone w="62%" h={10} style={{ marginTop: 8, marginBottom: 16 }} />
            {children}
        </section>
    );
}

function DashboardSkeleton() {
    return (
        <>
            <div className="db2-stats">
                {[0, 1, 2, 3].map((i) => (
                    <div className={`db2-stat db2-skel-stat${i === 0 ? " is-hero" : ""}`} key={i}>
                        <div className="db2-stat-top">
                            <Bone w={30} h={30} r={8} />
                            <Bone w={80} h={18} r={999} />
                        </div>
                        <Bone w="55%" h={11} style={{ marginTop: 14 }} />
                        <Bone w={46} h={28} style={{ marginTop: 8 }} />
                        <Bone w="45%" h={10} style={{ marginTop: 8 }} />
                    </div>
                ))}
            </div>

            <div className="db2-layout">
                <div className="db2-col">
                    <SkeletonCard titleWidth="35%">
                        <div className="db2-skel-chart">
                            {[55, 70, 40, 85, 60, 50, 75].map((height, i) => (
                                <Bone key={i} w="100%" h={`${height}%`} r={8} />
                            ))}
                        </div>
                    </SkeletonCard>

                    <SkeletonCard titleWidth="30%">
                        <div className="db2-interviews">
                            {[0, 1, 2, 3].map((i) => (
                                <div className="db2-interview db2-skel-plain" key={i}>
                                    <Bone w={42} h={42} r="50%" />
                                    <span style={{ flex: 1, display: "grid", gap: 6 }}>
                                        <Bone w="75%" h={11} />
                                        <Bone w="55%" h={9} />
                                        <Bone w="45%" h={9} />
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SkeletonCard>

                    <SkeletonCard titleWidth="32%">
                        <div className="db2-pets">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div className="db2-pet db2-skel-plain" key={i}>
                                    <Bone w="100%" h={100} r={0} />
                                    <span style={{ display: "grid", gap: 6, padding: "10px" }}>
                                        <Bone w="60%" h={11} />
                                        <Bone w="80%" h={9} />
                                        <Bone w="100%" h={18} r={999} />
                                    </span>
                                </div>
                            ))}
                        </div>
                    </SkeletonCard>

                    <SkeletonCard titleWidth="30%">
                        <div style={{ display: "grid", gap: 14 }}>
                            {[0, 1, 2, 3].map((i) => (
                                <div className="db2-skel-row" key={i}>
                                    <Bone w={34} h={34} r="50%" />
                                    <Bone w="30%" h={11} />
                                    <Bone w="14%" h={18} r={999} />
                                    <Bone w="14%" h={18} r={999} />
                                    <Bone w="10%" h={11} />
                                </div>
                            ))}
                        </div>
                    </SkeletonCard>
                </div>

                <div className="db2-col">
                    <SkeletonCard titleWidth="40%">
                        {[0, 1].map((i) => (
                            <div className="db2-food-item db2-skel-plain" key={i} style={{ marginBottom: 12 }}>
                                <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                                    <Bone w={30} h={30} r={8} />
                                    <Bone w="40%" h={12} />
                                </span>
                                <Bone w="55%" h={22} style={{ margin: "12px 0 8px" }} />
                                <Bone w="100%" h={8} r={999} />
                            </div>
                        ))}
                    </SkeletonCard>

                    <SkeletonCard titleWidth="35%">
                        {[0, 1, 2].map((i) => (
                            <div key={i} style={{ display: "grid", gap: 6, marginBottom: 16 }}>
                                <Bone w="50%" h={11} />
                                <Bone w="100%" h={10} r={999} />
                            </div>
                        ))}
                    </SkeletonCard>

                    <SkeletonCard titleWidth="45%">
                        <div className="db2-health">
                            <Bone w={140} h={140} r="50%" />
                            <span style={{ display: "grid", gap: 10, flex: 1 }}>
                                {[0, 1, 2, 3].map((i) => <Bone key={i} w="70%" h={10} />)}
                            </span>
                        </div>
                    </SkeletonCard>
                </div>
            </div>
        </>
    );
}

// ---------- page ----------

export default function AdminOverview({ onNavigate }) {
    const [now, setNow] = useState(() => new Date());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [lastLoaded, setLastLoaded] = useState(null);
    const [intakeFilter, setIntakeFilter] = useState("all");

    const user = savedUser();
    const isAdminUser = String(user.role || "").toLowerCase() === "admin";
    const firstName = String(user.name || user.username || "").split(" ")[0];

    // Clock
    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load everything, then refresh every minute
    useEffect(() => {
        let alive = true;

        async function load() {
            const sources = await Promise.allSettled([
                getJson("/api/animals"),
                getJson("/api/animals/intakes"),
                getJson("/api/adoptions"),
                getJson("/api/foster/assignments"),
                getJson("/api/foster/applications"),
                getJson("/api/vaccinations"),
                getJson("/api/supplies"),
                getJson("/api/settings/capacity"),
                getJson("/api/analytics/intake-forecast"),
                getJson("/api/activity-logs?limit=5"),
                getJson("/api/food-inventory"),
            ]);
            if (!alive) return;

            const pick = (i, key, fallback = []) =>
                sources[i].status === "fulfilled" ? sources[i].value[key] ?? fallback : fallback;

            if (sources[0].status === "rejected") {
                setError("Couldn't load the dashboard. Check your connection and try again.");
            } else {
                setError("");
            }

            const forecastBody = sources[8].status === "fulfilled" ? sources[8].value : null;

            setData({
                animals: pick(0, "animals"),
                intakes: pick(1, "intakes"),
                applications: pick(2, "applications"),
                assignments: pick(3, "assignments"),
                fosterApplications: pick(4, "applications"),
                vaccinations: pick(5, "vaccinations"),
                supplies: pick(6, "supplies"),
                capacity: pick(7, "shelterCapacity", 30) || 30,
                forecast: forecastBody?.target?.roundedPredictedIntake ?? null,
                activity: sources[9].status === "fulfilled" ? sources[9].value.logs || [] : null,
                foodInventory: sources[10].status === "fulfilled" ? sources[10].value.inventory || [] : null,
                loadedAt: Date.now(),
            });
            setLastLoaded(new Date());
            setLoading(false);
        }

        load();
        const timer = setInterval(load, REFRESH_MS);
        return () => {
            alive = false;
            clearInterval(timer);
        };
    }, []);

    const view = useMemo(() => {
        if (!data) return null;

        const nowMs = data.loadedAt;
        const today = new Date(nowMs);
        today.setHours(0, 0, 0, 0);

        const animals = data.animals;
        const inCare = animals.filter((a) => animalStatus(a) !== "adopted");
        const inShelter = inCare.filter((a) => animalStatus(a) !== "fostered");
        const dogs = inCare.filter((a) => a.type === "Dog").length;
        const cats = inCare.filter((a) => a.type === "Cat").length;
        const weekAgo = nowMs - 7 * 86400000;
        const newThisWeek = animals.filter((a) => new Date(a.intakeDate || a.createdAt).getTime() >= weekAgo).length;

        // Adoptions: approved applications, dated by when they were reviewed
        const approved = data.applications.filter((app) => app.status === "approved");
        const adoptedOn = (app) => app.reviewedAt || app.updatedAt;
        const reviewQueue = data.applications.filter((app) =>
            ["pending", "interview_scheduled", "interview_completed"].includes(app.status)
        );

        const months = lastMonths(MONTHS_SHOWN, new Date(nowMs));
        const intakeSeries = months.map((m) => {
            const list = animals.filter((a) => monthKey(a.intakeDate || a.createdAt) === m.key);
            return { count: list.length, names: list.map((a) => a.name) };
        });
        const adoptionSeries = months.map((m) => {
            const list = approved.filter((app) => monthKey(adoptedOn(app)) === m.key);
            return { count: list.length, names: list.map((app) => app.petName || "Unnamed") };
        });
        const adoptionsThisMonth = adoptionSeries[adoptionSeries.length - 1].count;
        const adoptionsLastMonth = adoptionSeries[adoptionSeries.length - 2].count;

        // Foster
        const activeFosters = data.assignments.filter((a) => a.status === "active");
        const lastUpdate = (assignment) => {
            const dates = (assignment.updates || []).map((u) => new Date(u.createdAt || 0).getTime());
            return Math.max(new Date(assignment.startDate || assignment.createdAt || 0).getTime(), ...dates);
        };
        const fosterDue = activeFosters.filter((a) => nowMs - lastUpdate(a) > 7 * 86400000);
        const fosterSpace = data.fosterApplications
            .filter((app) => app.status === "approved")
            .reduce((sum, app) => sum + (Number(app.capacity) || 1), 0);

        // Health
        const healthGroups = HEALTH_GROUPS.map((g) => ({
            ...g,
            animals: inCare
                .filter((a) => healthGroup(a) === g.key)
                .map((a) => ({
                    ...a,
                    line: `${a.name}${a.medicalStatus ? ` — ${a.medicalStatus}` : ""}`,
                })),
        }));
        const needCare = healthGroups.filter((g) => g.key === "sick" || g.key === "observation");

        // Vaccines: the latest dose of each vaccine per animal, overdue if its next date passed
        const latestDose = new Map();
        data.vaccinations.forEach((v) => {
            const animalId = v.animal_id?._id || v.animal_id;
            const key = `${animalId}-${String(v.vaccine_name || "").toLowerCase()}`;
            const current = latestDose.get(key);
            if (!current || new Date(v.vaccination_date) > new Date(current.vaccination_date)) latestDose.set(key, v);
        });
        const inCareIds = new Set(inCare.map((a) => String(a._id)));
        const overdue = [...latestDose.values()].filter((v) => {
            const animalId = String(v.animal_id?._id || v.animal_id);
            return inCareIds.has(animalId) && v.next_due_date && new Date(v.next_due_date) < today;
        });
        const vaccinatedIds = new Set(
            data.vaccinations.map((v) => String(v.animal_id?._id || v.animal_id))
        );
        const withVaccine = inCare.filter((a) => vaccinatedIds.has(String(a._id))).length;

        // Needs attention (one card per pet + reason)
        const animalById = new Map(animals.map((a) => [String(a._id), a]));
        const attention = [];
        reviewQueue.forEach((app) =>
            attention.push({
                id: `app-${app._id}`,
                name: app.petName || "Unnamed",
                detail: app.fullName ? `Applicant: ${app.fullName}` : app.petBreed || "",
                image: app.petImage,
                type: animalById.get(String(app.animalId?._id || app.animalId))?.type,
                tag: "Adoption to review",
                tone: "o",
                page: "adoption-applications",
            })
        );
        data.intakes.forEach((a) =>
            attention.push({
                id: `intake-${a._id}`,
                name: a.name,
                detail: a.location ? `Found in ${a.location.split(",")[0]}` : a.type,
                image: a.image,
                type: a.type,
                tag: "Intake waiting",
                tone: "b",
                page: "intake-records",
            })
        );
        overdue.forEach((v) => {
            const animal = animalById.get(String(v.animal_id?._id || v.animal_id));
            attention.push({
                id: `vac-${v._id}`,
                name: animal?.name || v.animal_id?.name || "Unknown",
                detail: `${v.vaccine_name} · due ${shortDate(v.next_due_date)}`,
                image: animal?.image,
                type: animal?.type,
                tag: "Vaccine overdue",
                tone: "r",
                page: "vaccination-records",
            });
        });
        healthGroups
            .find((g) => g.key === "sick")
            .animals.forEach((a) =>
                attention.push({
                    id: `sick-${a._id}`,
                    name: a.name,
                    detail: [a.type, a.breed].filter(Boolean).join(" · "),
                    image: a.image,
                    type: a.type,
                    tag: a.intakeCondition || "Sick",
                    tone: "r",
                    page: "medical-records",
                })
            );
        fosterDue.forEach((f) =>
            attention.push({
                id: `foster-${f._id}`,
                name: f.petName || "Unnamed",
                detail: `with ${f.fosterName || "foster"}`,
                image: f.petImage,
                type: animalById.get(String(f.animalId?._id || f.animalId))?.type,
                tag: "Foster update due",
                tone: "o",
                page: "foster-care",
            })
        );

        // Status chart
        const statusGroups = STATUS_GROUPS.map((g) => {
            const list = animals.filter((a) => animalStatus(a) === g.key);
            const fosterOf = (a) => activeFosters.find((f) => String(f.animalId?._id || f.animalId) === String(a._id));
            const label = (a) => (g.key === "fostered" && fosterOf(a) ? `${a.name} — ${fosterOf(a).fosterName}` : a.name);
            return {
                ...g,
                dogs: list.filter((a) => a.type === "Dog").map(label),
                cats: list.filter((a) => a.type === "Cat").map(label),
            };
        });

        // Urgent supplies
        const urgentSupplies = data.supplies.filter(
            (s) => s.status === "active" && ["Urgent", "High"].includes(s.priority)
        );

        return {
            inCare,
            inShelter,
            dogs,
            cats,
            newThisWeek,
            months,
            intakeSeries,
            adoptionSeries,
            adoptionsThisMonth,
            adoptionsLastMonth,
            pendingAdoptions: reviewQueue.length,
            activeFosters,
            fosterDue,
            fosterSpace,
            healthGroups,
            needCare,
            overdue,
            withVaccine,
            attention,
            statusGroups,
            urgentSupplies,
            recentIntakes: [...data.intakes, ...animals]
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                .slice(0, 8),
            upcomingInterviews: data.applications
                .filter((app) => app.status === "interview_scheduled" && app.interviewSchedule && new Date(app.interviewSchedule).getTime() >= nowMs - 3600000)
                .sort((a, b) => new Date(a.interviewSchedule) - new Date(b.interviewSchedule))
                .slice(0, 4),
        };
    }, [data]);

    function go(page) {
        if (onNavigate) onNavigate(page);
    }

    const foodLevels = buildFoodLevels(data?.foodInventory || [], view?.inCare || []);

    const clock = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
    const dateLine = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    const header = (
        <div className="db2-top">
            <div>
                <h1>
                    {greeting(now)}
                    {firstName && <>, <span>{firstName}</span></>}
                </h1>
                <p className="db2-hello">Here&apos;s how the shelter is doing today.</p>
            </div>
            <div className="db2-clock">
                <b>{clock}</b>
                <small>{dateLine}</small>
                <span className="db2-live">Live · updated {lastLoaded ? timeAgo(lastLoaded, now.getTime()) : "…"}</span>
            </div>
        </div>
    );

    if (loading || !view) {
        return (
            <section className="db2-page" aria-busy="true" aria-label="Loading the dashboard">
                {header}
                <DashboardSkeleton />
            </section>
        );
    }

    const shelterUsed = view.inShelter.length;
    const capacity = data.capacity;
    const shelterPercent = Math.round((shelterUsed / capacity) * 100);
    const fosterPercent = view.fosterSpace ? Math.round((view.activeFosters.length / view.fosterSpace) * 100) : 0;
    const forecastTotal = data.forecast != null ? shelterUsed + data.forecast : null;
    const forecastPercent = forecastTotal != null ? Math.round((forecastTotal / capacity) * 100) : null;
    const percentColor = (p) => (p >= 90 ? "#c62828" : p >= 70 ? "#d96f00" : "#2f8f5b");
    const barColor = (p) => (p >= 90 ? "#e5534b" : p >= 70 ? "#fcbf49" : "#2e9e4f");
    const adoptionDiff = view.adoptionsThisMonth - view.adoptionsLastMonth;
    const sickCount = view.healthGroups.find((g) => g.key === "sick").animals.length;
    const obsCount = view.healthGroups.find((g) => g.key === "observation").animals.length;

    const nowMs = now.getTime();
    const dayLabel = (date) => {
        const d = new Date(date);
        const today = new Date(nowMs);
        const tomorrow = new Date(nowMs + 86400000);
        if (d.toDateString() === today.toDateString()) return "Today";
        if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };
    const healthKey = (a) => healthGroup(a);
    const intakeRows = view.recentIntakes
        .filter((a) => intakeFilter === "all" || healthKey(a) === intakeFilter)
        .slice(0, 5);

    return (
        <section className="db2-page">
            {header}

            {error && <div className="db2-error" role="alert">{error}</div>}

            <div className="db2-stats">
                <StatCard
                    hero
                    icon="/icons/sidebar/brown paw-light.svg"
                    badge={view.newThisWeek ? `▲ ${view.newThisWeek} this week` : null}
                    badgeClass="is-yellow"
                    label="Animals in care"
                    value={view.inCare.length}
                    note={`${view.dogs} dogs · ${view.cats} cats`}
                />
                <StatCard
                    icon="/icons/heart-brown.svg"
                    badge={adoptionDiff === 0 ? "Same as last month" : `${adoptionDiff > 0 ? "▲" : "▼"} ${Math.abs(adoptionDiff)} vs last month`}
                    badgeClass={adoptionDiff >= 0 ? "is-green" : "is-red"}
                    label="Adoptions this month"
                    value={view.adoptionsThisMonth}
                    note={`${view.pendingAdoptions} application${view.pendingAdoptions === 1 ? "" : "s"} to review`}
                />
                <StatCard
                    icon="/icons/home.svg"
                    badge="Active"
                    badgeClass="is-blue"
                    label="Foster assignments"
                    value={view.activeFosters.length}
                    note={view.fosterDue.length ? `${view.fosterDue.length} update${view.fosterDue.length === 1 ? "" : "s"} due` : "All updates on time"}
                />
                <StatCard
                    icon="/icons/medical-brown.svg"
                    badge={sickCount + obsCount ? "Alert" : "All clear"}
                    badgeClass={sickCount + obsCount ? "is-red" : "is-green"}
                    label="Need medical care"
                    value={sickCount + obsCount}
                    note={`${sickCount} sick/injured · ${obsCount} observation`}
                />
            </div>

            <div className="db2-layout">
                {/* ---------- Left (wide) column ---------- */}
                <div className="db2-col">
                    <section className="db2-card">
                        <h3>
                            Intake vs adoptions
                            <span className="db2-legend db2-legend-inline">
                                <span style={{ "--c": "#fb8500" }}>Intakes</span>
                                <span style={{ "--c": "#2e9e4f" }}>Adoptions</span>
                                {data.forecast != null && <span style={{ "--c": "#c9b48f" }}>Forecast (AI)</span>}
                            </span>
                        </h3>
                        <p className="db2-sub">Animals that came in vs. went home each month. Hover a month.</p>
                        <LineChart months={view.months} intakes={view.intakeSeries} adoptions={view.adoptionSeries} forecast={data.forecast} />
                    </section>

                    <section className="db2-card">
                        <h3>
                            Upcoming interviews
                            <span className="db2-chip">
                                <img src="/icons/Clock.svg" alt="" aria-hidden="true" />
                                {view.upcomingInterviews.length} scheduled
                            </span>
                        </h3>
                        <p className="db2-sub">Adoption interviews coming up.</p>
                        {view.upcomingInterviews.length === 0 ? (
                            <p className="db2-allclear">No interviews scheduled.</p>
                        ) : (
                            <div className="db2-interviews">
                                {view.upcomingInterviews.map((app) => {
                                    const when = new Date(app.interviewSchedule);
                                    const soon = when.getTime() - nowMs < 3600000;
                                    return (
                                        <button type="button" className="db2-interview" key={app._id} onClick={() => go("adoption-applications")}>
                                            <span className="db2-interview-avatar">
                                                {String(app.fullName || "?").split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
                                                <i className={soon ? "is-soon" : ""} />
                                            </span>
                                            <span className="db2-interview-info">
                                                <b>{app.fullName || "Applicant"}</b>
                                                <small>Adopting {app.petName || "a pet"}</small>
                                                <em>
                                                    <img src="/icons/Clock.svg" alt="" aria-hidden="true" />
                                                    {when.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · {dayLabel(when)}
                                                </em>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    <section className="db2-card">
                        <h3>
                            Needs your attention
                            {view.attention.length > 0 && <span className="db2-chip">{view.attention.length} to do</span>}
                        </h3>
                        <p className="db2-sub">Click a pet to open what needs doing.</p>
                        {view.attention.length === 0 ? (
                            <p className="db2-allclear">All caught up. Nothing needs your attention right now.</p>
                        ) : (
                            <div className="db2-pets">
                                {view.attention.map((item) => (
                                    <button type="button" className="db2-pet" key={item.id} onClick={() => go(item.page)}>
                                        <span className="db2-pet-photo">
                                            {item.image ? <img src={item.image} alt="" /> : <img className="is-icon" src={PET_FALLBACK_ICON} alt="" />}
                                        </span>
                                        <span className="db2-pet-body">
                                            <b>{item.name}</b>
                                            <small>{item.detail}</small>
                                            <span className={`db2-tag is-${item.tone}`}>{item.tag}</span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="db2-card">
                        <h3>
                            Incoming animals
                            <span className="db2-filters">
                                {[["all", "All"], ["healthy", "Healthy"], ["sick", "Sick"], ["unknown", "Unknown"]].map(([key, label]) => (
                                    <button
                                        type="button"
                                        key={key}
                                        className={intakeFilter === key ? "is-on" : ""}
                                        onClick={() => setIntakeFilter(key)}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </span>
                        </h3>
                        <p className="db2-sub">Latest intakes and their review status.</p>
                        {intakeRows.length === 0 ? (
                            <p className="db2-allclear">No intakes to show.</p>
                        ) : (
                            <div className="db2-table-wrap">
                                <table className="db2-table">
                                    <thead>
                                        <tr>
                                            <th>Animal</th>
                                            <th>Source</th>
                                            <th>Health</th>
                                            <th>Review</th>
                                            <th className="is-right">Intake date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {intakeRows.map((a) => {
                                            const waiting = !a.intakeStatus || a.intakeStatus === "pending_review";
                                            const health = healthKey(a);
                                            return (
                                                <tr key={a._id} onClick={() => go("intake-records")}>
                                                    <td>
                                                        <span className="db2-animal">
                                                            <span className="db2-animal-photo">
                                                                {a.image ? <img src={a.image} alt="" /> : <img className="is-icon" src={PET_FALLBACK_ICON} alt="" />}
                                                            </span>
                                                            <span>
                                                                <b>{a.name}</b>
                                                                <small>{[a.intakeType, a.location?.split(",")[0]].filter(Boolean).join(" · ")}</small>
                                                            </span>
                                                        </span>
                                                    </td>
                                                    <td>{a.intakeSource === "field" ? "📱 Phone" : a.intakeSource === "desk" ? "Computer" : "—"}</td>
                                                    <td>
                                                        <span className={`db2-pill is-${health}`}>
                                                            {health === "sick" ? a.intakeCondition || "Sick" : health === "observation" ? "Observation" : health === "healthy" ? "Healthy" : "Unknown"}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span className={`db2-pill ${waiting ? "is-wait" : a.intakeStatus === "rejected" ? "is-sick" : "is-healthy"}`}>
                                                            {waiting ? "Waiting" : a.intakeStatus === "rejected" ? "Rejected" : "Approved"}
                                                        </span>
                                                    </td>
                                                    <td className="is-right">{shortDate(a.intakeDate || a.createdAt)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>

                {/* ---------- Right (narrow) column ---------- */}
                <div className="db2-col">
                    <section className="db2-card">
                        <h3>
                            Food levels
                            <button type="button" className="db2-link" onClick={() => go("food-storage")}>
                                Supplies
                            </button>
                        </h3>
                        <p className="db2-sub">Stock left and how long it lasts at the current headcount.</p>
                        {data.foodInventory === null ? (
                            <p className="db2-empty">Couldn&apos;t load food stock.</p>
                        ) : foodLevels.length === 0 ? (
                            <p className="db2-empty">No food items yet. Add stock in Supplies.</p>
                        ) : (
                            <div className="db2-food">
                                {foodLevels.slice(0, FOOD_ITEMS_SHOWN).map((food) => (
                                    <div className={`db2-food-item${food.isLow ? " is-low" : ""}`} key={food.id}>
                                        <div className="db2-food-head">
                                            <img src="/icons/sidebar/supplies-brown.svg" alt="" aria-hidden="true" />
                                            <div>
                                                <b>{food.name}</b>
                                                <small>
                                                    {food.eaters} {food.species ? `${food.species.toLowerCase()}${food.eaters === 1 ? "" : "s"}` : `animal${food.eaters === 1 ? "" : "s"}`} in care
                                                </small>
                                            </div>
                                        </div>
                                        <div className="db2-food-value">
                                            {food.stockKg.toLocaleString()} kg{" "}
                                            <span>
                                                {food.daysLeft === null ? "· no animals eating this now" : `· about ${food.daysLeft} day${food.daysLeft === 1 ? "" : "s"} left`}
                                            </span>
                                        </div>
                                        <div className="db2-meter" title={`Goal: ${food.targetDays} days of stock`}>
                                            <i style={{ width: `${food.coverage}%` }} />
                                        </div>
                                        <span className={food.isLow ? "db2-low" : "db2-ok"}>
                                            {food.isLow ? "Low · restock soon" : "Enough for now"}
                                        </span>
                                    </div>
                                ))}
                                {foodLevels.length > FOOD_ITEMS_SHOWN && (
                                    <button type="button" className="db2-link" onClick={() => go("food-storage")}>
                                        +{foodLevels.length - FOOD_ITEMS_SHOWN} more in Supplies
                                    </button>
                                )}
                            </div>
                        )}
                    </section>

                    <section className="db2-card">
                        <h3>
                            Space used
                            {isAdminUser && (
                                <button type="button" className="db2-link" onClick={() => go("global-settings")}>
                                    Change limit
                                </button>
                            )}
                        </h3>
                        <p className="db2-sub">Animals in care vs. the space available.</p>
                        <div className="db2-util">
                            <div>
                                <div className="db2-util-head">
                                    <div>
                                        <b>RescueBase Shelter</b>
                                        <small>{shelterUsed} of {capacity} spaces</small>
                                    </div>
                                    <span style={{ color: percentColor(shelterPercent) }}>{shelterPercent}%</span>
                                </div>
                                <div className="db2-meter is-thick">
                                    <i style={{ width: `${Math.min(100, shelterPercent)}%`, background: barColor(shelterPercent) }} />
                                </div>
                            </div>
                            <div>
                                <div className="db2-util-head">
                                    <div>
                                        <b>Foster homes</b>
                                        <small>
                                            {view.fosterSpace
                                                ? `${view.activeFosters.length} of ${view.fosterSpace} spaces offered`
                                                : "No approved foster homes yet"}
                                        </small>
                                    </div>
                                    <span style={{ color: view.fosterSpace ? percentColor(fosterPercent) : "#8a6a4a" }}>
                                        {view.fosterSpace ? `${fosterPercent}%` : "—"}
                                    </span>
                                </div>
                                <div className="db2-meter is-thick">
                                    <i style={{ width: `${Math.min(100, fosterPercent)}%`, background: barColor(fosterPercent) }} />
                                </div>
                            </div>
                            {forecastPercent != null && (
                                <div>
                                    <div className="db2-util-head">
                                        <div>
                                            <b>Next month (AI forecast)</b>
                                            <small>+{data.forecast} expected → about {forecastTotal} of {capacity}</small>
                                        </div>
                                        <span style={{ color: percentColor(forecastPercent) }}>{forecastPercent}%</span>
                                    </div>
                                    <div className="db2-meter is-thick">
                                        <i className="is-striped" style={{ width: `${Math.min(100, forecastPercent)}%` }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="db2-card">
                        <h3>
                            Animals health
                            <button type="button" className="db2-link" onClick={() => go("medical-records")}>View medical</button>
                        </h3>
                        <p className="db2-sub">Condition of the {view.inCare.length} animals in care. Hover a slice.</p>
                        <div className="db2-health">
                            <HealthDonut groups={view.healthGroups} total={view.inCare.length} />
                            <div className="db2-health-side">
                                {view.healthGroups.map((g) => (
                                    <span key={g.key} className="db2-legend-row" style={{ "--c": g.color }}>
                                        {g.label} · {g.animals.length}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <p className="db2-health-foot">
                            <b>{view.overdue.length}</b> vaccine{view.overdue.length === 1 ? "" : "s"} overdue ·{" "}
                            <b>{view.withVaccine}/{view.inCare.length}</b> with a vaccine on record
                        </p>
                    </section>

                    {data.activity && (
                        <section className="db2-card">
                            <h3>
                                Recent activity
                                <button type="button" className="db2-link" onClick={() => go("activity-log")}>View log</button>
                            </h3>
                            <p className="db2-sub">Latest actions in the system.</p>
                            {data.activity.length === 0 ? (
                                <p className="db2-allclear">No activity yet.</p>
                            ) : (
                                <div className="db2-activity">
                                    {data.activity.slice(0, 5).map((log) => (
                                        <div className="db2-activity-row" key={log._id}>
                                            <img src={activityIcon(log.activityType)} alt="" aria-hidden="true" />
                                            <span>
                                                <b>{log.activity}</b>
                                                <small>
                                                    {[log.user?.name || log.user?.username, timeAgo(log.activityDate, nowMs)].filter(Boolean).join(" · ")}
                                                </small>
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </section>
    );
}
