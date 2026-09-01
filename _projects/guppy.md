---
title: "Guppy: DIY AI Personal Assistant"
date: 2024-03-10
summary: "A voice-activated AI companion running on a Raspberry Pi 4, built in Python on top of OpenAI's ChatGPT."
tags:
  - AI
  - Raspberry Pi
  - Python
status: "Shipped"
hero: "/assets/projects/guppy/hero.jpg"
hero_alt: "Guppy, the Raspberry Pi AI assistant"
repo: "https://github.com/samblaha/Guppy"
specs:
  Hardware: "Raspberry Pi 4"
  Language: "Python"
  Brain: "OpenAI ChatGPT API"
  Input: "Wake word + speech recognition"
  Output: "Text-to-speech"
---

## Overview
Guppy is an AI assistant designed to run on the Raspberry Pi 4, leveraging OpenAI's ChatGPT to give you an interactive companion that's always ready to help. Built in Python and integrated with OpenAI's API, Guppy goes beyond simple voice commands and offers a dynamic, conversational experience that feels personal and intuitive.

## How it works
- **Voice activation.** Guppy listens for a wake word and springs into action when it hears its name. This is built on Python's speech recognition library, so Guppy stays attentive but unobtrusive.
- **Query processing.** Once activated, Guppy captures your voice, converts speech to text, and sends it securely to OpenAI's ChatGPT API. The integration lets it understand context, remember past interactions, and craft relevant responses.
- **Response generation.** ChatGPT generates a response tailored to the request, whether that's answering a question, offering advice, or telling a joke.
- **Voice response.** Guppy talks back. The text-to-speech is tuned for clear, pleasant audio so the conversation feels natural.
- **Continuous improvement.** Guppy is designed to evolve, with updates that add features and expand what it knows.

## Key features
- Interactive voice responses powered by OpenAI's ChatGPT.
- Built specifically for the Raspberry Pi 4, optimized for performance and reliability.
- Direct, secure API integration for fast, accurate responses.
- Open source. The whole codebase is on GitHub to explore, modify, or contribute to.
