---
title: "Caesar Cipher Encrypt & Decrypt"
date: 2021-01-01
summary: "A small Python GUI that shifts plain text into cipher text and back again, one character at a time."
tags:
  - Python
  - Cryptography
  - Software
status: "Shipped"
hero: "/assets/projects/caesar-cipher/hero.png"
hero_alt: "The Caesar cipher app encrypting and decrypting a message"
specs:
  Language: "Python"
  Interface: "Desktop GUI"
  Algorithm: "Caesar shift, configurable key"
---

## Overview
The plain text is traversed one character at a time. For each character in the input, the app transforms it according to the key, either encrypting or decrypting depending on what was asked for. Once every character has been shifted, a new string is generated, which is the cipher text.

## How it works
- Take the plain text and an integer key from the GUI.
- Walk the string one character at a time, shifting each letter by the key.
- Decryption is the same walk with the shift reversed.
- Display the resulting cipher text (or recovered plain text) back in the window.

<figure class="prose__figure panel">
  <video src="/assets/projects/caesar-cipher/demo.mp4" poster="/assets/projects/caesar-cipher/demo.jpg" autoplay muted loop playsinline></video>
  <figcaption>The GUI encrypting and decrypting text with a chosen key.</figcaption>
</figure>
