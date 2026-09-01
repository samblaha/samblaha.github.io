---
# Suggested filename format:
#   _projects/<slug>.md
# Example:
#   _projects/laser-timing-gates.md
#
# Slug rules:
# - lowercase
# - hyphen-separated
# - keep it short and memorable

title: "Project Title"
date: 2025-01-01
summary: "One sentence that tells what it is and why it matters."
tags:
  - Swift
  - SwiftUI
  - VisionOS
status: "Shipped"            # "In progress" gets a pulsing yellow sticker, "Shipped" a cyan check
hero: "/assets/projects/<slug>/hero.jpg"
hero_alt: "What the hero image shows"
hero_caption: "Optional caption under the hero"
gallery:
  - "/assets/projects/<slug>/1.jpg"
  - "/assets/projects/<slug>/2.jpg"
repo: "https://github.com/your-handle/your-repo"
demo: "https://example.com"
comments: true               # set false to hide the discussion panel on this post

# Optional: rendered as a spec-sheet card above the write-up
specs:
  MCU: "ESP32-S3"
  Display: "4.7″ e-paper"

# Optional: rendered as a checklist-style bill of materials after the write-up
parts:
  - name: "Part name"
    note: "Why it's here / where it goes"
    qty: 1
    link: "https://example.com/part"

# Optional: rendered as a dated timeline; great for in-progress builds
log:
  - date: 2025-01-01
    title: "First light"
    note: "Short update. **Markdown** works here."
---

## Overview
What it is, who it’s for, and what problem it solves. Keep it crisp.

## Why I built it
The motivation. What was missing? What constraint mattered?

> Blockquotes render as sticky notes. Use them for warnings, asides, or the
> “here’s the thing nobody tells you” moment.

## Build notes
Key implementation decisions (architecture, tradeoffs, performance, UX).

```cpp
// Fenced code blocks get a language sticker and a copy button.
void setup() {
  Serial.begin(115200);
}
```

![Alt text becomes the caption, and the image opens in a lightbox.](/assets/projects/<slug>/1.jpg)

## Challenges
Hard parts and how you worked through them.

| Attempt | Result |
| ------- | ------ |
| Tables  | look like this |

## What’s next
Next improvements or experiments (optional, but nice).
