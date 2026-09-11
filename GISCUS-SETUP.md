# Giscus Setup Instructions

To enable the Project Ideas comment section with upvoting, follow these steps:

## Current status (Idea Box heat, 2026-09)

Checked against the live GitHub repo and [giscus.app](https://giscus.app):

| Piece | Status |
| --- | --- |
| GitHub Discussions | **On** |
| Repo id | `MDEwOlJlcG9zaXRvcnkzNTE1MzQxNDU=` (real) |
| Category named **Project Ideas** | **Missing** |
| Default **Ideas** category | Exists (`DIC_kwDOFPP8Qc4C0DyV`) — not used |

`_includes/giscus.html` therefore still has **empty** `data-repo-id` / `data-category-id`. The homepage Idea Box uses a local IR heat strip of unfinished `_projects/` instead of inventing a category ID. Fill the IDs only after you create a **Project Ideas** category and copy the values from giscus.app.

## 1. Enable GitHub Discussions

1. Go to your repository: https://github.com/samblaha/samblaha.github.io
2. Click on **Settings**
3. Scroll down to **Features**
4. Check the box for **Discussions**

## 2. Create "Project Ideas" Category

1. Go to the **Discussions** tab in your repository
2. Click on the **Categories** (pencil icon)
3. Click **New category**
4. Create a category named: `Project Ideas`
5. Choose **Announcement** format (this allows upvoting/reactions)

## 3. Install Giscus App

1. Visit: https://github.com/apps/giscus
2. Click **Install**
3. Select your repository: `samblaha/samblaha.github.io`

## 4. Get Configuration Values

1. Go to: https://giscus.app
2. Enter your repository: `samblaha/samblaha.github.io`
3. Select the **Project Ideas** category
4. Copy the `data-repo-id` and `data-category-id` values

## 5. Update the Configuration

Edit `_includes/giscus.html` and replace the empty Liquid assigns:

- `giscus_repo_id` → paste your repo ID
- `giscus_category_id` → paste your **Project Ideas** category ID (not the default Ideas category)

Do not paste a made-up ID. The include only loads `client.js` when both values are non-empty.

## Theme Configuration

The comment section automatically adapts to your site's light/dark theme using `data-theme="preferred_color_scheme"` / `transparent_dark`, and `theme.js` posts the lamp-switch to the iframe.

## Features

- ✅ Users can post project ideas
- ✅ Upvote/react to ideas with emoji reactions
- ✅ Comments and discussion on each idea
- ✅ GitHub authentication required (prevents spam)
- ✅ Fully responsive design
