---
title: "Virtual Golf Ball Rack"
date: 2026-09-02
summary: "A digital replica of the mahogany display case on my wall — every logo ball from every course played, clickable and pinned on a map."
tags:
  - Golf
  - Software
  - Web
status: "Shipped"
hero: "/assets/projects/virtual-ball-rack/hero.svg"
hero_alt: "A mahogany display case filled with logo golf balls"
hero_fit: "contain"
demo: "/rack/"
repo: "https://github.com/samblaha/virtual-ball-rack"
specs:
  Layout: "9 × 13 mahogany case, felt shelves"
  Collection: "78 logo balls"
  Map: "Leaflet + Esri street tiles"
  Data: "Transcribed from a photo of the real rack"
---

## Overview
I keep a physical golf ball rack — a 9-column mahogany case with black felt shelves, one logo ball for (almost) every course I've played. This is the digital twin: same grid, same empty drilled slots at the bottom, and every stamp transcribed from a photo of the real thing.

[Open the rack →](/rack/)

## How it works
- Each ball sits at its real `row`/`col` in the case. Empty positions render as drilled holes, the way the physical rack looks when a shelf isn't full.
- Click a ball to pull up the course, city, and any notes — then fly the map to that pin.
- Click a map pin or a course chip and the matching ball pulses in the case, so you can find it on the wall.
- Amber dots mark logos that were hard to read in the photo. Those are best guesses, not gospel.

> If you recognize a mystery ball, tell me. A few stamps are still unidentified, including a small purple logo on row 1.

## The collection
Most of the case is Ohio muni and club golf, then trips: Myrtle Beach and the Grand Strand, the Robert Trent Jones Trail in Alabama, Boyne country in northern Michigan, Pinehurst, and a couple of Arizona rounds. Specials — a photo ball, an autograph, a novelty "Backbreaker" stamp — sit in with the rest instead of getting their own shelf.

The live rack is the source of truth. Edit `data.js` (or send a correction) and the map, stats, and course list update with it.
