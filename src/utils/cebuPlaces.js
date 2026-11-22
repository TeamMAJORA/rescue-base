// Place search limited to Cebu (mainland, Mactan and nearby islands)
export async function searchCebuPlaces(query, signal) {
    const params = new URLSearchParams({
        format: "jsonv2",
        q: query,
        limit: "6",
        countrycodes: "ph",
        viewbox: "123.25,11.35,124.25,9.40",
        bounded: "1",
        addressdetails: "1",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, { signal });
    const data = await response.json();

    return (Array.isArray(data) ? data : []).map((item) => {
        const a = item.address || {};
        const name = item.name || String(item.display_name || "").split(",")[0];
        const area = [a.suburb || a.village || a.neighbourhood || a.quarter, a.city || a.town || a.municipality]
            .filter(Boolean)
            .filter((part) => part !== name)
            .join(", ");

        return {
            id: String(item.place_id),
            name,
            area: area || String(item.display_name || "").split(",").slice(1, 3).join(",").trim(),
            latitude: Number(item.lat),
            longitude: Number(item.lon),
        };
    });
}
