# Emby SDK compatibility review

Reviewed against the official Emby plugin UI documentation:
- https://dev.emby.media/home/sdk/plugins/index.html
- https://dev.emby.media/doc/plugins/ui/index.html
- https://dev.emby.media/doc/plugins/ui/simpleui.html

## Decision

This plugin intentionally keeps its custom HTML/JavaScript configuration page for now. It is not a direct fit for `BasePluginSimpleUI<T>`: the current page loads the server's user list, lets an administrator choose multiple users, applies a set of changes through existing user/configuration endpoints, and verifies the results. The Simple Plugin UI documentation describes a generated options page and explicitly says it does not support complex UIs or custom button actions.

The full Plugin UI framework may be a future migration path, but migrating requires rewriting the interaction model and validating the relevant SDK APIs against the target Emby Server SDK. Replacing the page with a simple options class would remove existing functionality, so this package does not do that.

## What this source package does

- Retains the existing multi-user workflow and API calls.
- Keeps the plugin settings under the plugin configuration page; it does not add a separate main-menu route.
- Includes responsive layout rules and English/Dutch language detection.
- Uses the signed-in Emby dashboard API session and does not embed an API key.

## What it does not claim

- It does not bypass any restrictions in Emby Android or Store apps that prevent a plugin configuration page from opening.
- It does not claim the Windows Theater layering issue is fixed.
- It is source code only, not a compiled or app-tested DLL.

## Required validation before production

1. Build with the target Emby SDK and .NET SDK.
2. Test in Emby Web with an administrator account.
3. Test on Android and Windows Theater. Record whether the app opens the page at all before debugging CSS/JavaScript.
4. If an app displays Emby's own “sign in to your local server directly” message, investigate app/plugin allowlisting or the app's configuration-page policy; do not treat that message as proof of a broken login session.
5. Test applying settings against a test user before using “all users” on the production server.
