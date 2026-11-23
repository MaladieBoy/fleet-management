export const LICENSE_CATEGORIES = [
    { value: "B", label: "Category B (Light Vehicle)" },
    { value: "C", label: "Category C (Heavy Goods Vehicle)" },
    { value: "C+E", label: "Category C+E (Articulated / Semi-trailer)" },
    { value: "D", label: "Category D (Public Transport)" }
];

export const HUB_SUGGESTIONS = [
    "Radès Main Hub",
    "Ben Arous Logistics",
    "La Goulette Port"
];

export function getFullName(driver) {
    return (
        (driver?.firstName || "") + " " + (driver?.lastName || "")
    ).trim();
}

export function getInitials(driver) {
    const first = (driver?.firstName || "").charAt(0);
    const last = (driver?.lastName || "").charAt(0);

    return (first + last).toUpperCase() || "?";
}

export function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("en-GB");
}

export function toDateInput(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
}

export function getRegionName(region) {
    if (region && typeof region === "object" && region.name) {
        return region.name;
    }

    return "";
}
