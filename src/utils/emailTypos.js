// Same typo rules as the server (rescuebase-server/utils/emailCheck.js), so a mistyped email is caught
// as soon as the sign-up form is sent. The server also checks the domain can receive mail.
export const EMAIL_FORMAT = /^[^\s@]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;

// Providers most people use; a near miss of one of these is almost always a typo
const BIG_PROVIDERS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];
// Real providers that sit one or two letters away from the big ones: never "correct" these
const REAL_LOOKALIKES = new Set(["mail.com", "gmx.com", "ymail.com", "aol.com", "me.com", "mac.com", "msn.com", "live.com", "email.com"]);
// Mistyped endings
const ENDING_TYPOS = { cmo: "com", con: "com", coom: "com", comm: "com", vom: "com", xom: "com", ocm: "com", nte: "net", ner: "net", orgg: "org" };

// Letters added, removed, changed or swapped (optimal string alignment distance)
function typoDistance(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
    }
    return d[a.length][b.length];
}

// Returns the corrected email, or "" when the domain doesn't look like a typo
export function suggestEmailFix(email) {
    const at = email.lastIndexOf("@");
    const localPart = email.slice(0, at);
    const parts = email.slice(at + 1).toLowerCase().split(".");
    const ending = parts.pop();
    const domain = [...parts, ENDING_TYPOS[ending] || ending].join(".");

    if (REAL_LOOKALIKES.has(domain)) return "";
    if (BIG_PROVIDERS.includes(domain)) return domain === email.slice(at + 1).toLowerCase() ? "" : `${localPart}@${domain}`;

    const closest = BIG_PROVIDERS.find((provider) => typoDistance(provider, domain) <= 2);
    if (closest) return `${localPart}@${closest}`;
    return ENDING_TYPOS[ending] ? `${localPart}@${domain}` : "";
}
