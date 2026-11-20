# Changelog

Notable changes to gym-sim, newest first. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/). All money is in NT dollars.

## [Unreleased]

### Changed
- The money step opens with a loan sized to the gym (about six months of running costs); a short start is said plainly, in orange, with a one-tap way out.
- The HUD has a Skip to closing button. Start over sits apart from the skip buttons. The model's dials are behind one Advanced disclosure.
- Month card: comparisons are per day or per 30 days, each change lists only what it can cause, the break-even count says why it moved, and one line carries the result down to net profit. The Year view adds the same up.
- The desk always keeps one full-timer; the Staff tab gives the smallest desk's true cost and effect, and says what cleaners do.
- Chinese: open cards follow a language switch, one word each for staff terms, the Year table counts in 萬.

### Fixed
- A closed month's stamp shows the whole month's result. A closed day's stamp and verdict give one figure.
- Day and week pops draw above the books and the sheet; the day card and toasts wait for them. Skipped days raise no PR toasts.
- Undo on the price list no longer cancels a list already published.
- The large hall fits a phone's width at opening.

## [0.3.0] - 2026-11-16

### Added
- Cleaners on the Staff tab, paid a wage. Mess (a loaded bar to strip, strewn dumbbells) now makes visits worse.
- A new README with an animated hero shot and screenshots.

### Changed
- With no cleaner, the receptionist cleans when it's quiet and paces by reception.
- Closing a week early pops each day's takings; closing a month pops the month's once. Pops glow only for an all-time best.

### Fixed
- The desk hint no longer sits under the receptionist's speech bubble.

## [0.2.0] - 2026-11-15

### Added
- Run the gym as a business: open a Small, Medium or Large gym with your own money and a bank loan, then trade month after month.
- The P&L at the front desk: today, the month and the year, plus bank, members, pricing, staff and facility.
- Members who join, lapse and return. Prices, crowding, staffing and retention actions all change how many stay.
- Gyms laid out by rules, and Rearrange to move, buy or sell equipment; the gym closes while the work is done.
- A staff roster: desk staff and coaches. More coaches sell more PT.
- Starting goals, a receptionist who talks, and progress saved in the browser.

### Changed
- The game opens on the size screen, and the gym opens on today's date.
- Members don't all use the changing room; some take a washroom break.
- Bigger text, clearer digits, see-through walls and posts near the camera, and one grid in Build and Rearrange.
- "Books" are now called the P&L.

### Removed
- The sample gym ("Take over a running gym") for now, the seed, Copy results and several developer sliders.

### Fixed
- Flicker and stray specks in Build view, walls popping up when adding equipment, and misaligned plots on phones.

## [0.1.0] - 2026-11-13

### Added
- First release: a pixel-art isometric strength gym, simulated person by person over a day, with visit fees, PT packs, outside-coach rentals and money pops.
- English and Traditional Chinese.

[0.3.0]: https://github.com/yyoyochen/gym-sim/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/yyoyochen/gym-sim/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/yyoyochen/gym-sim/releases/tag/v0.1.0
