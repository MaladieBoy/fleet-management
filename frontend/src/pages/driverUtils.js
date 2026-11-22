export const LICENSE_CATEGORIES = [
    { value: "B", label: "Permis B (Léger - VL)" },
    { value: "C", label: "Permis C (Poids Lourd - PL)" },
    { value: "C+E", label: "Permis C+E (Articulé / Semi-remorque)" },
    { value: "D", label: "Permis D (Transport en Commun)" }
];

export const HUB_SUGGESTIONS = [
    "Radès Hub Principal",
    "Ben Arous Logistique",
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

    return date.toLocaleDateString("fr-FR");
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
