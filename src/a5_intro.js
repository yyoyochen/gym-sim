// ================================================================ the opening camera's timing (first-minute polish). Pure: no THREE, no DOM.
// The camera waits at the door until the first member is inside, follows them, and hands off only once they have been lifting for a moment;
// a cap makes sure the goal card always comes, even if that member never reaches a station.
const INTRO_SET_MIN_S = 1.5;   // real seconds of lifting that count as a set; the hand-off waits for that set to end (judge round 1: the card must not cover the lift)
const INTRO_LIFT_MAX_S = 6;    // a set that runs this long hands off anyway
const INTRO_CAP_S = 22;        // real seconds of following at most
function introHandoff(followT, liftT, liftingNow) { return (liftT >= INTRO_SET_MIN_S && !liftingNow) || liftT >= INTRO_LIFT_MAX_S || followT >= INTRO_CAP_S; }
function introInside(z, hz) { return z < hz - 0.5; }   /* past the front wall (z = hz), clear of the doorway */
