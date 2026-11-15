// Plain-language Privacy and Terms shown from the landing page footer.
// Review these with your adviser and the partner shelter before the defense.

export function PrivacyText() {
    return (
        <>
            <p>
                RescueBase helps our partner shelter run adoptions, foster care, donations, and
                lost-and-found reports. This page explains what we collect and why, in line with the
                Philippine Data Privacy Act of 2012 (Republic Act No. 10173).
            </p>

            <h3>What we collect</h3>
            <ul>
                <li>Your account details: name, email, and phone number.</li>
                <li>Adoption and foster applications: details about you and your home.</li>
                <li>Donations: your name, what you gave, and any payment reference or receipt you upload.</li>
                <li>Lost, found, and stray reports: photos, the area, and a contact number.</li>
            </ul>

            <h3>How it's used</h3>
            <ul>
                <li>Shelter staff use it to review applications, confirm donations, and contact you.</li>
                <li>Your phone number and email are never shown on public pages.</li>
                <li>Lost and found pins on the public map show only an approximate area, not an exact address.</li>
                <li>We do not sell your information or share it for advertising.</li>
            </ul>

            <h3>Where it's stored</h3>
            <p>
                Data is kept on secure cloud services used to run the site (for sign-in, the database,
                and photo storage). Only shelter staff and the people you deal with, such as the owner
                of a pet you reported finding, can see your contact details.
            </p>

            <h3>Your choices</h3>
            <p>
                You can update your details in Account Settings. To see, correct, or delete your
                information, contact the shelter using the Contact link below.
            </p>
        </>
    );
}

export function TermsText() {
    return (
        <>
            <p>
                By using RescueBase you agree to these terms. They are written to be short and clear.
            </p>

            <h3>Who does what</h3>
            <ul>
                <li>
                    RescueBase is a platform built by Team MAJORA. Our partner shelter manages its own
                    animals, applications, and donations here.
                </li>
                <li>
                    The shelter makes every decision about adoptions, fostering, and animal care. Sending
                    an application does not guarantee an adoption.
                </li>
            </ul>

            <h3>Your part</h3>
            <ul>
                <li>Give true information in your account, applications, and reports.</li>
                <li>Only report animals you have actually lost, found, or seen.</li>
                <li>Be respectful to shelter staff and other users.</li>
            </ul>

            <h3>Donations</h3>
            <p>
                Money donations go straight to the shelter's own accounts shown on this page. The
                RescueBase team never receives or holds donated money. Staff confirm each donation
                once it arrives.
            </p>

            <h3>Content and accounts</h3>
            <p>
                Shelter staff may edit or remove reports, photos, or accounts that are false, harmful,
                or break these terms.
            </p>
        </>
    );
}
