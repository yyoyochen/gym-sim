# Changelog

All money is in NT dollars and shown as `$`.

## 2026-11-15: clearer view and layout

- Benches stand beside the dumbbell racks instead of across the room.
- Corner posts, the entrance frame and the low walls on the camera's side turn see-through, whichever way the view is turned.
- Adding equipment in the builder no longer makes the walls and windows pop up and down.
- One grid only, shown in Build and Rearrange; the finer sub-grid is gone.
- Build overlays sit clear of the floor so they do not flicker.
- Bigger text everywhere, with more room between the P&L rows.
- The date under Run shows just the day, without a day count.
- The books are called P&L everywhere; the phone tab reads P&L with no emoji, like the other tabs.
- On phones the plots side by side line up, whatever their titles and legends wrap to.

## 2026-11-15: rearrange your gym

You can change the floor of a running gym at any time. The gym closes while the work is done.

### Rearrange
- Press Rearrange to pause and see your gym as pieces on the grid. Drag a piece to move it; the game picks which way it faces and refuses a spot without room for it and its clear floor.
- Add any piece at its catalogue price, or tap a piece to sell it for 40% of its price.
- The sheet shows the running cost and the days closed before you apply. Cancel changes nothing.
- Movers cost $3,000 per heavy piece moved; light pieces move free.
- The gym closes for 1 day per 4 heavy pieces moved, plus 1 day if anything new is installed. The days start tomorrow and can run into the next month. Today finishes on the old layout.
- The sample gym converts to grid pieces the first time you apply a rearrange; its rent area and deal stay the same, including after Setup.

### Books
- New P&L lines: "Rearranging (movers)", and "Loss on equipment sold" below EBITDA (book value less what the sale brought).
- Equipment bought later is depreciated over 5 years from the month it was bought; closed months keep the figures they were booked with.
- The Bank tab shows equipment bought and sold since opening; the Today tab says when the gym is closed for rearranging.

## 2026-11-15: gyms laid out by rules

Built gyms are now planned piece by piece on a finer grid, by the same rules a real gym follows.

### Layout
- Every piece of equipment has its real footprint on a 0.455 m sub-grid (each 1.82 m cell split 4 × 4); the builder draws the sub-grid in lighter lines.
- Auto-layout follows general rules: racks and platforms along the back wall, dumbbells on the left wall with benches beside them, the turf and sled lane across the middle, cardio facing the windows, machines in rows. The game picks which way each piece faces.
- Every piece keeps clear floor for the lifter, a rest spot and a short queue, and stays reachable from the door.
- The washrooms move to the back corner, away from reception.
- No more pillars inside built gyms.

### Builder
- "+" adds exactly one piece where it fits, or says the floor is full; it never moves or removes anything else. "−" takes away the newest piece of that kind.
- Changing the plot size re-plans the layout.
- The turf and sled lane has an In / Out switch. Where it does not fit, switching it In re-plans the gym with the lane placed first and says what no longer fits; Out gives that equipment back.
- Equipment is priced per piece.

### Other
- The gym opens on today's date; the first month is the rest of this month, with costs, the loan payment and depreciation for those days only.
- Digits everywhere use a clearer pixel font, so a 5 no longer reads as an S or an 8.
- The browser tab reads "gym-sim".

## The gym as a business

The day simulation becomes a business you run month after month: money, members, a builder, and a first session that starts by opening your own gym.

### First session
- The game opens on a three-step builder: pick a size (Small 80 坪, Medium 160 坪, Large 320 坪), see the setup cost, then decide your own money and bank loan. Opening overdrawn is allowed and shown in orange.
- "Take over a running gym" skips the build and runs the established sample gym.
- A built gym opens as a new business: about 145 members who signed up before opening, growing month by month (the researched new-gym ramp: 15% of the area's demand at opening, most of it within about 6 months).
- When the doors open, the camera follows the first member in, then hands control to you.
- Pick a starting goal, or skip: reach 500 members by the end of month 3, don't run out of cash in year 1, or keep at least 92% of members every month. Progress shows under the clock and in the books.
- The intro shows once; "Show intro again" and "Change goal" live under More.

### The books at the front desk
- Tap the desk (or 📒 Books on phones) to open the books: Today, Books (P&L), Bank, Members, Pricing, Staff and Facility.
- A full itemised profit and loss for today, month to date, the projected month and the year, with a plain line on top: "The gym made / lost $X today".
- Below EBITDA: depreciation, loan interest, tax and net profit.
- Bank: your own money, a bank loan with monthly instalments, and cash day by day.
- Close the day, the week or the month early; the business carries into the next month.
- Prices are published at the desk and apply the next morning.

### Members and demand
- A member base that persists across the month: joins, lapses, returns, member cards and PT packs.
- Prices move visits, joins and evening demand; a long door queue turns people away, and crowded visits raise churn.
- Staffing affects retention; the rental policy for outside coaches affects PT.
- Retention actions for members drifting away: a check-in message, a PT taster, a voucher, or a win-back SMS, each with its chance, cost and effect.
- Typhoon days close the gym; rain dampens visits.

### Gym builder
- Build from a plot size: walls, floor, door, desk, washrooms, lights and structural columns follow the plot.
- Researched equipment and fit-out prices, a three-month deposit and a rent-free first month; each item shows its unit price.
- Equipment fits its zones along the walls, and you pay only for what is placed.

### Look and feel
- The price board sits on the reception desk; men's and women's washrooms with M and W plaques.
- Hovering outlines equipment in yellow with an expand icon; the person you follow gets an animated floor marker.
- Money pops when members pay on the way out; a bigger one for a PT sale.
- Figures use a clearer pixel font; rotate, zoom, language and sound sit at the top right.
- Seed and Copy results moved under More; the Go button says "Start the day" before opening.

### Fixes
- A member who reaches the stop after the last bus goes home another way.
- Many smaller fixes found by self-tests, scripted playtests and reviews.

### Tests
- Node tests for the pure model (P&L, demand, month, builder), and 172 headless self-tests run in Chrome.
