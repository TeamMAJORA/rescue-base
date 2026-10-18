import confetti from "canvas-confetti";

// Confetti from both sides of the screen (same effect as the "side cannons" example)
export function fireSideCannons(duration = 3000) {
    // skip for users who turned on "reduce motion"
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const end = Date.now() + duration;
    const colors = ["#a786ff", "#fd8bbc", "#eca184", "#f8deb1"];

    const frame = () => {
        if (Date.now() > end) return;

        confetti({
            particleCount: 2,
            angle: 60,
            spread: 55,
            startVelocity: 60,
            origin: { x: 0, y: 0.5 },
            colors,
        });

        confetti({
            particleCount: 2,
            angle: 120,
            spread: 55,
            startVelocity: 60,
            origin: { x: 1, y: 0.5 },
            colors,
        });

        requestAnimationFrame(frame);
    };

    frame();
}