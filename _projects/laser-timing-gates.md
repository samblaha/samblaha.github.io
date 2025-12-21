---
title: "DIY Ereader - OpenPage"
date: 2025-12-20
summary: "A distraction-free, open-source e-reader built on the LilyGo T5-4.7-S3 with AI-powered daily briefs and support for EPUB, TXT, and CBZ."
tags:
  - Hardware
  - Embedded
  - UX
  - AI
status: "In progress"
repo: "https://github.com/samblaha/DIYEreader"
demo: ""
layout: project
---

## Overview
OpenPage is a dedicated, distraction-free reading device built around the LilyGo T5-4.7-S3 e-paper display. 

It is designed to read `.epub`, `.txt`, and `.cbz` files directly from an SD card, offering a high-contrast 4.7-inch display. A standout feature is the "Daily Brief" mode, which uses the OpenAI API to generate and deliver a curated summary of current events straight to the device over WiFi.

## Why I built it
I wanted a reading device that was completely under my control—no proprietary stores, no tracking, and no notifications. 

The goal was to combine the longevity of e-paper with the extensibility of the ESP32, allowing for features like AI-powered summaries and custom layout engines that commercial devices don't offer.

## Build notes
- **Custom Portrait Pipeline**: Developed a rendering pipeline to work in a 540x960 portrait buffer on hardware that is landscape-native.
- **Intelligent Power Management**: Implemented a dual-sleep strategy using Light Sleep for instant wake during reading and Deep Sleep for long-term power savings.
- **PSRAM Optimization**: Heavy use of the ESP32-S3's PSRAM to store framebuffers and large EPUB chapters without crashing.
- **AI Daily Brief**: Integrates OpenAI's Responses API with web-search tools to generate offline-readable briefs stored on the SD card.

## Parts / Stack
- **Hardware**: LilyGo T5-4.7-S3 (ESP32-S3, 16MB Flash, 8MB PSRAM).
- **Firmware**: C++/Arduino via PlatformIO.
- **AI**: OpenAI API (GPT-4o) for curated content.
- **Storage**: SD card for local library and bookmark persistence.

## Challenges
- **EPUB Pagination**: Creating a fast, memory-efficient pager that handles word wrapping and image placement on an embedded chip.
- **Battery Accuracy**: Mapping the non-linear LiPo discharge curve to provide accurate percentage feedback during high-current WiFi tasks.
- **Image Scaling**: Implementing a grayscale-aware blitter to scale high-resolution CBZ and EPUB images for the 16-level grayscale display.

## What’s next
- **Enhanced Typography**: Support for custom fonts and full text justification.
- **WiFi Book Syncing**: Wireless delivery of books via a local server or cloud integration.
- **Local Dictionary**: Long-press word lookups using an on-device database.
- **UI Polish**: Cover art previews in the book picker menu.
