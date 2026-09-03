export default function StatsBand({ stats }) {
    return (
        <section className="stats-band">
            {stats.map((item) => (
                <div
                    className="stat-item"
                    key={item.label}
                >
                    <strong>{item.value}</strong>
                    <span>{item.label}</span>
                </div>
            ))}
        </section>
    );
}