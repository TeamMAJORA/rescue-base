import { useState } from "react";

const TEAM_PHOTO = "/images/team-majora.jpg";

export default function HeartsCodeSection() {
    // Until the team photo is added to public/images, leave the photo box out instead of a broken image
    const [hasTeamPhoto, setHasTeamPhoto] = useState(true);

    return (
        <section className="hearts-code-section" id="about">
            <div className={`hearts-code-content${hasTeamPhoto ? "" : " no-photo"}`}>
                {hasTeamPhoto && (
                    <div className="hearts-code-image">
                        <img
                            src={TEAM_PHOTO}
                            alt="Team MAJORA"
                            onError={() => setHasTeamPhoto(false)}
                        />
                    </div>
                )}

                <div className="hearts-code-text">
                    <h2>
                        The Hearts & Code
                        <br />
                        Behind RescueBase
                    </h2>
                    <p>
                        We are Team MAJORA, a group of fourth-year Information
                        Technology students united by a shared passion for animal
                        welfare and smart software design. We created RescueBase to
                        bridge the gap between local shelters, dedicated supporters,
                        and loving adopters.
                    </p>
                    <p>
                        Our partner shelter manages its own animals, applications,
                        and donations here. We built the tools; the shelter team
                        makes every decision about adoptions and care.
                    </p>
                </div>
            </div>
        </section>
    );
}
