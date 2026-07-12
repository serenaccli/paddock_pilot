# Paddock Pilot

Audio-first navigation prototype for blind and low-vision spectators at the Australian Grand Prix venue in Albert Park.

## Venue map

The prototype venue package combines:

- official Australian Grand Prix circuit and visitor-map references for named event features;
- OpenStreetMap-derived base paths and road context;
- manually digitised temporary paths and facilities; and
- clearly labelled simulated hackathon features.

Every graph edge retains accessibility attributes, confidence and provenance. Missing fields remain `null`; the router never interprets missing accessibility evidence as confirmation.

The weighted graph router balances estimated travel time and route simplicity and supports hard constraints such as avoiding stairs. It is prototype guidance, not a certified mobility aid or live operational map.

## Run locally

```bash
npm install
npm run dev
```
