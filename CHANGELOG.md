# Changelog

All money is in NT dollars and shown as `$`.

## Unreleased: the gym as a business (`pnl-sandbox`)

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
