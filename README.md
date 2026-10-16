# Emby User Settings Manager — beta

<p align="center">
  <img src="Configuration/logo.png" width="420" alt="Emby User Settings Manager">
</p>

**Mass-edit user settings and permissions across multiple Emby users at once.**

> Beta plugin for Emby Server administrators.

![Main page](docs/hoofdpagina.png)
![User selection](docs/users1.jpg)
![User selection](docs/users2.jpg)

## What is this?

Emby lets you configure user preferences (display, home screen, subtitles, sound, etc.) per user. When you manage more than a handful of users, changing these settings one by one quickly becomes tedious.

**Emby User Settings Manager** gives administrators a single page where you can:

- Select multiple users at once
- Choose exactly which settings to apply
- Optionally copy settings from an existing user
- Save reusable presets
- Apply everything in one go (with verification)

It mirrors Emby’s own user settings pages (Display, Detail screens, Home & library, Sound, Advanced, Subtitles) and also supports selected user policy/permission settings.

## Features

- **Bulk apply** – Select any combination of users and settings
- **Copy from user** – Quickly fill the form with another user’s current values
- **Presets** – Save named configurations for later reuse (stored in plugin config)
- **Verification** – Every change is read back and confirmed per user
- **Smart detection** – Only shows settings that actually exist on your server (others are greyed out)
- **Safe by design** – Admin-only access, cannot lock yourself out, credentials are never copied
- **Bilingual** – English + Dutch UI (auto-detects language)

## How it works

1. Open the plugin page (Dashboard → Plugins → Emby User Settings Manager)
2. *(Optional)* Use **Copy settings from a user** to load an existing user’s values
3. Check the settings you want to apply (everything is checked by default)
4. Select the target users (nothing is pre-selected)
5. Click **Apply**

On open, the plugin scans the stored settings of all users to discover which keys exist on your server. Settings whose key cannot be found are automatically greyed out and are never applied.

**Presets**: name the current selection and save it. Presets are stored on the server in the plugin configuration (`PresetsJson`).

**Other settings found (advanced)** lists remaining stored keys under their internal names (unchecked by default).  
**Copy detected keys (diagnostics)** shows the keys found on your server — useful for mapping greyed-out settings.

### User permissions

User permissions (Profile & account, Playback permissions, Feature access, Access & parental control) are written to the user policy. They are unchecked by default and skipped by “Check all”.

- Making users administrators requires an extra confirmation
- You cannot disable your own account or remove your own administrator rights
- Credentials (password / PIN) are never copied
- The profile PIN is optional, unchecked by default, and never saved in presets or diagnostics

### Technical notes

- Library order is applied as `OrderedViews`
- Home sections are applied as `homesection0..6` (unused slots set to `none`)
- Default screen per library as `landing-<libraryId>`
- Device-only settings (subtitle appearance, profile picture, notifications) cannot be set from a server plugin

## UI and compatibility

- English and Dutch UI text; detects the dashboard document language first, then browser/app language, with English fallback
- Responsive CSS for narrow mobile screens and embedded WebViews
- The page remains a custom HTML/JavaScript UI because it needs user selection, custom apply actions, and verification  
  → See [`SDK-COMPATIBILITY.md`](SDK-COMPATIBILITY.md) for why the official Simple Plugin UI template is not a drop-in replacement
- Registered as a configuration page (no separate main-menu entry)
- Uses the signed-in Emby dashboard `ApiClient` session — no API key is embedded or stored

> Note: Responsive layout and localization improve the page itself but cannot override an app’s policy for which plugin configuration pages it allows. Android’s “sign in to your local server directly” message and Windows Theater’s layering issue still require app-specific investigation and testing.

## Safe test procedure

1. Back up the currently installed plugin DLL and its configuration
2. Test the build on a test Emby Server first
3. Verify the page loads, users load, and a single test user’s settings are correctly applied and verified
4. Only then consider production use. Do **not** use “all users” until the single-user test passes
