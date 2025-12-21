# Giscus Setup Instructions

To enable the Project Ideas comment section with upvoting, follow these steps:

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

Edit `_includes/giscus.html` and replace the empty values:
- `data-repo-id=""` → paste your repo ID
- `data-category-id=""` → paste your category ID

## Theme Configuration

The comment section automatically adapts to your site's light/dark theme using `data-theme="preferred_color_scheme"`.

## Features

- ✅ Users can post project ideas
- ✅ Upvote/react to ideas with emoji reactions
- ✅ Comments and discussion on each idea
- ✅ GitHub authentication required (prevents spam)
- ✅ Fully responsive design

