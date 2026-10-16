# Emby User Settings Manager — beta

<p align="center">
  <img src="Configuration/logo.png" width="420" alt="Emby User Settings Manager">
</p>

**A server plugin that adds a dashboard page to apply user settings to only the users you select, so you don't have to change them one by one.**

![Main page](docs/hoofdpagina.png)
![User selection](docs/users1.jpg)
![User selection](docs/users2.jpg)

## What it does

- The page follows Emby's own user settings pages: **Display**, **Detail screens**, **Home & library**, **Sound**, **Advanced** and **Subtitles**.
- Everything is checked by default; only checked settings are applied. Uncheck what you don't want to change.
- No users are preselected. Tick the target users and press **Apply**. Every change is read back and verified per user.
- **Presets**: save a selection under a name and apply it to one or more users later.
- **Optional**: copy the settings of an existing user into the page.
- Settings your server has never stored are greyed out and never applied.
- User permissions (Profile & account, Playback, Feature access, Access & parental control) are unchecked by default. Making someone an administrator needs an extra confirmation.
- **Administrators only**.
- Passwords and PINs are never copied, and the optional profile PIN is never stored in presets or diagnostics.
- The plugin appears in the **Advanced** section of the dashboard menu.

## Languages

English, Dutch, German, French and Spanish.  
By default it follows the language of your Emby server; you can also pick one manually in the language menu next to the title.

## Install

1. Download the latest release from the [Releases page](https://github.com/mrmuiz/Emby-User-Settings-manager/releases)
2. Copy `EmbyUserSettingsManager.dll` to the `plugins` folder of your Emby Server
3. Restart the server
4. Open **Dashboard → Advanced → Emby User Settings Manager**

## Please note

- This is a **beta**. Please test on a test user first before applying settings to everyone.
- Settings that Emby only keeps on the device (for example subtitle appearance) can't be set from a server plugin.
- Library names are shown as they are stored on your server and are not translated.
- Feedback and screenshots of anything that looks wrong are very welcome.

## Technical details

- On open, the plugin reads the stored settings of all users to discover which keys exist on your server. Settings whose key cannot be found are greyed out and never applied.
- Presets are stored on the server in the plugin configuration (`PresetsJson`).
- User permissions are written to the user policy (`Users/{id}/Policy`).
- Library order is applied as `OrderedViews`; home sections as `homesection0..6` (unused slots set to `none`); default screen per library as `landing-<libraryId>`.
- The page uses a custom HTML/JavaScript UI (see [`SDK-COMPATIBILITY.md`](SDK-COMPATIBILITY.md) for why the official Simple Plugin UI is not used).
- Uses the signed-in Emby dashboard session — no API key is embedded or stored.

## Safe test procedure

1. Back up the currently installed plugin DLL and its configuration
2. Test on a test Emby Server first
3. Verify with a **single test user** before applying to everyone
4. Only then consider production use
