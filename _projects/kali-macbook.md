---
title: "Rebuilt Kali Linux MacBook"
date: 2020-06-01
summary: "A MacBook with a shattered screen, dead battery, and corrupt drive, brought back to life as a dedicated ethical hacking laptop."
tags:
  - Security
  - Hardware
  - Linux
status: "Shipped"
hero: "/assets/projects/kali-macbook/hero.jpg"
hero_alt: "The rebuilt MacBook running Kali Linux"
gallery:
  - "/assets/projects/kali-macbook/1.jpg"
  - "/assets/projects/kali-macbook/2.jpg"
parts:
  - name: "Replacement screen"
    note: "The original was shattered"
    qty: 1
  - name: "Replacement battery"
    note: "The original was dead"
    qty: 1
  - name: "SSD"
    note: "Upgraded from the corrupt hard drive"
    qty: 1
---

## Overview
This MacBook had a shattered screen, a dead battery, and a corrupt hard drive. After replacing the screen and battery, upgrading the hard drive to an SSD, and installing the latest Kali Linux kernel, I had a separate laptop dedicated to practicing ethical hacking — not a restored Mac, a practice machine.

After the rebuild it still looks like a MacBook Pro — the bezel still says so — but it's a Linux desktop, MagSafe attached, logged in as `sam@ALYA`.

## The rebuild
The hardware had to work before the OS mattered:

1. Replace the shattered screen so it was a laptop again, not a paperweight.
2. Swap the dead battery so it could leave the charger.
3. Pull the corrupt hard drive and upgrade it to an SSD.
4. Install the latest Kali Linux kernel on the new drive.

Once those four steps were done, it was a Linux machine that happened to still look like a MacBook. Kali is the point of the box — a dedicated practice environment with the usual security tooling, kept off the daily driver. A typical session is a terminal on the new screen paging through nmap's option list.

## On the bench
It sits on the bench with an Alfa USB wireless adapter plugged in — the small black box with the antenna and the blue LED. Kali on the internal SSD, extra radio over USB when the work needs a dedicated adapter.

> It's still a MacBook Pro on the outside. None of the original three failures survived the rebuild, and the OS isn't macOS anymore.
