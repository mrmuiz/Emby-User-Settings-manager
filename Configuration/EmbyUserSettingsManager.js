define([], function () {
    'use strict';
    return function (view, params) {
        (function () {
            var page = view;
            if (!page || page.getAttribute('data-eus-initialized') === '1') return;
            page.setAttribute('data-eus-initialized', '1');

            var PLUGIN_ID = 'a67b5b10-19df-48b1-b2db-4f63a7e3d54a';
            var users = [], loading = false, applying = false, discovered = false;
            var presets = [], entries = [], uidCounter = 0;
            var obs = { config: {}, prefs: {}, policy: {} };   // observed values across all users
            var adminData = { config: {}, prefs: {}, policy: {} };
            var views = [];                          // [{Id, Name}]

            // ---------------------------------------------------------------
            // Settings as on the Emby user settings pages.
            //  key   = exact storage key (known)
            //  alias = regex used to find the key among the keys that exist on
            //          this server (display preferences only store changed keys)
            // target: 'config' = Users/{id}/Configuration, 'prefs' = CustomPrefs
            // ---------------------------------------------------------------
            var BOOL = [['true', 'on'], ['false', 'off']];
            var HOME_OPTS = [['none', 'secNone'], ['smalllibrarytiles', 'secLibrary'], ['librarybuttons', 'secLibraryButtons'], ['resume', 'secResume'], ['resumeaudio', 'secResumeAudio'], ['latestmedia', 'secLatest'], ['nextup', 'secNextUp'], ['livetv', 'secLiveTv'], ['activerecordings', 'secRecordings'], ['playlists', 'secPlaylists']];
            var SKIP_OPTS = [['5000', '5 s'], ['10000', '10 s'], ['15000', '15 s'], ['20000', '20 s'], ['30000', '30 s']];
            var HOME_DEF = ['smalllibrarytiles', 'resume', 'latestmedia', 'none', 'none', 'none', 'none'];
            var DEFS = [
                // Display
                { id: 'theme', group: 'display', label: 'theme', target: 'prefs', key: 'appTheme', options: [['dark', 'Dark'], ['light', 'Light'], ['auto', 'Auto']], def: 'dark' },
                { id: 'accent', group: 'display', label: 'accentColor', target: 'prefs', key: 'accentColor', options: [['blue', 'Blue'], ['purple', 'Purple'], ['green', 'Green'], ['red', 'Red'], ['orange', 'Orange'], ['pink', 'Pink'], ['emby', 'Emby']], def: 'blue' },
                { id: 'audioBackdrop', group: 'display', label: 'audioBackdrop', target: 'prefs', key: 'nowPlayingVideoBackgroundStyle', options: [['backdrop', 'bgBackdrop'], ['blur', 'bgBlur']], def: 'blur' },
                { id: 'tvView', group: 'display', label: 'tvView', target: 'prefs', key: 'seriesDisplay', options: [['episodessingleseason', 'episodessingleseason']], def: 'episodessingleseason' },
                { id: 'singleFolder', group: 'display', label: 'singleFolder', target: 'prefs', key: 'enableAutoFolderJumpThrough', options: BOOL, def: 'true' },
                { id: 'spoiler', group: 'display', label: 'spoiler', target: 'prefs', key: 'hideEpisodeSpoilerInfo', options: BOOL, def: 'false' },
                { id: 'hideMore', group: 'display', label: 'hidePlayedMore', target: 'config', key: 'HidePlayedInMoreLikeThis', vtype: 'boolean', def: false },
                { id: 'hideSugg', group: 'display', label: 'hidePlayedSuggestions', target: 'config', key: 'HidePlayedInSuggestions', vtype: 'boolean', def: false },
                { id: 'hideLatest', group: 'display', label: 'hidePlayedLatest', target: 'config', key: 'HidePlayedInLatest', vtype: 'boolean', def: false },
                // Detail screens
                { id: 'logo', group: 'detail', label: 'logoAsTitles', target: 'prefs', key: 'enableLogoAsTitle', options: BOOL, def: 'true' },
                { id: 'posterDetail', group: 'detail', label: 'posterDetail', target: 'prefs', key: 'showDetailPoster', alsoKeys: ['showDetailPostertv'], options: BOOL, def: 'true' },
                { id: 'genreLists', group: 'detail', label: 'genreLimitLists', target: 'prefs', key: 'genreLimitForListsOnDetails', def: '3' },
                { id: 'genreLimit', group: 'detail', label: 'genreLimit', target: 'prefs', key: 'genreLimitOnDetails', def: '3' },
                { id: 'fullMedia', group: 'detail', label: 'fullMedia', target: 'prefs', key: 'showFullMediaInfoOnDetailScreen', options: BOOL, def: 'true' },
                // Home & library
                { id: 'homeList', group: 'home', label: 'homeSections', target: 'prefs', key: 'homesection*', vtype: 'json', kind: 'homelist', def: HOME_DEF.filter(function (x) { return x !== 'none'; }) },
                { id: 'focusPrev', group: 'home', label: 'focusPreviews', target: 'prefs', key: 'enableHomescreenFocusPreviews', options: BOOL, def: 'true' },
                { id: 'views', group: 'home', label: 'libraryOrder', target: 'config', key: 'OrderedViews', vtype: 'json', kind: 'views', def: [] },
                { id: 'myMediaExcl', group: 'home', label: 'myMediaExcludes', target: 'config', key: 'MyMediaExcludes', vtype: 'json', kind: 'libexcl', defaultUnchecked: true, def: [] },
                { id: 'latestExcl', group: 'home', label: 'latestExcludes', target: 'config', key: 'LatestItemsExcludes', vtype: 'json', kind: 'libexcl', defaultUnchecked: true, def: [] },
                { id: 'missingEps', group: 'home', label: 'displayMissingEpisodes', target: 'config', key: 'DisplayMissingEpisodes', vtype: 'boolean', def: false },
                // Sound
                { id: 'audioLang', group: 'sound', label: 'audioLanguage', target: 'config', key: 'AudioLanguagePreference', placeholder: 'dut, eng, ger…', def: '' },
                { id: 'defAudio', group: 'sound', label: 'playDefaultAudio', target: 'config', key: 'PlayDefaultAudioTrack', vtype: 'boolean', def: true },
                { id: 'remAudio', group: 'sound', label: 'rememberAudio', target: 'config', key: 'RememberAudioSelections', vtype: 'boolean', def: true },
                // Advanced
                { id: 'autoplay', group: 'playback', label: 'autoplayNext', target: 'config', key: 'EnableNextEpisodeAutoPlay', vtype: 'boolean', def: true },
                { id: 'nextPreview', group: 'playback', label: 'nextPreview', target: 'prefs', key: 'enableNextVideoInfoOverlay', options: BOOL, def: 'true' },
                { id: 'skipFwd', group: 'playback', label: 'skipForward', target: 'prefs', key: 'skipForwardLength', options: SKIP_OPTS, def: '10000' },
                { id: 'skipBack', group: 'playback', label: 'skipBack', target: 'prefs', key: 'skipBackLength', options: SKIP_OPTS, def: '10000' },
                { id: 'rewind', group: 'playback', label: 'resumeRewind', target: 'config', key: 'ResumeRewindSeconds', vtype: 'number', options: [['0', 'rewindNone'], ['5', '5 s'], ['10', '10 s'], ['15', '15 s'], ['30', '30 s']], def: 0 },
                { id: 'intro', group: 'playback', label: 'skipIntros', target: 'config', key: 'IntroSkipMode', options: [['AutoSkip', 'autoSkip'], ['ShowButton', 'showButton'], ['None', 'off']], def: 'AutoSkip' },
                { id: 'stillWatching', group: 'playback', label: 'stillWatching', target: 'prefs', key: 'stillwatchingms', def: '0' },
                { id: 'ratingInfo', group: 'playback', label: 'ratingInfo', target: 'prefs', key: 'enableRatingInfoOnPlaybackStart', options: BOOL, def: 'true' },
                { id: 'upAction', group: 'playback', label: 'upAction', target: 'prefs', key: 'videoScreenUpAction', def: 'chapters' },
                // Subtitles
                { id: 'subLang', group: 'subs', label: 'subtitleLanguage', target: 'config', key: 'SubtitleLanguagePreference', placeholder: 'dut, eng, ger…', def: '' },
                { id: 'subMode', group: 'subs', label: 'subtitleMode', target: 'config', key: 'SubtitleMode', options: [['Default', 'subDefault'], ['Smart', 'subSmart'], ['OnlyForced', 'subForced'], ['Always', 'subAlways'], ['None', 'off']], def: 'Default' },
                { id: 'subSkipBack', group: 'subs', label: 'subSkipBack', target: 'config', key: 'ShowSubtitlesOnSkipBack', vtype: 'boolean', def: true },
                { id: 'subLowVol', group: 'subs', label: 'subLowVolume', target: 'config', key: 'ShowSubtitlesOnLowVolume', vtype: 'boolean', def: true },
                { id: 'pin', group: 'account', label: 'profilePin', target: 'config', key: 'ProfilePin', sensitive: true, pattern: /^(\d{4})?$/, placeholder: 'pinPlaceholder', i18nPlaceholder: true, def: '' },
                { id: 'isAdmin', group: 'account', label: 'isAdmin', target: 'policy', key: 'IsAdministrator', vtype: 'boolean', optIn: true, def: false },
                { id: 'remoteAccess', group: 'account', label: 'remoteAccess', target: 'policy', key: 'EnableRemoteAccess', vtype: 'boolean', optIn: true, def: true },
                { id: 'userPrefs', group: 'account', label: 'userPrefs', target: 'policy', key: 'EnableUserPreferenceAccess', vtype: 'boolean', optIn: true, def: true },
                { id: 'isDisabled', group: 'account', label: 'isDisabled', target: 'policy', key: 'IsDisabled', vtype: 'boolean', optIn: true, def: false },
                { id: 'isHidden', group: 'account', label: 'isHidden', target: 'policy', key: 'IsHidden', vtype: 'boolean', optIn: true, def: false },
                { id: 'isHiddenRemotely', group: 'account', label: 'isHiddenRemotely', target: 'policy', key: 'IsHiddenRemotely', vtype: 'boolean', optIn: true, def: false },
                { id: 'isHiddenUnused', group: 'account', label: 'isHiddenUnused', target: 'policy', key: 'IsHiddenFromUnusedDevices', vtype: 'boolean', optIn: true, def: false },
                { id: 'mediaPlayback', group: 'perms', label: 'mediaPlayback', target: 'policy', key: 'EnableMediaPlayback', vtype: 'boolean', optIn: true, def: true },
                { id: 'audioTranscode', group: 'perms', label: 'audioTranscode', target: 'policy', key: 'EnableAudioPlaybackTranscoding', vtype: 'boolean', optIn: true, def: true },
                { id: 'videoTranscode', group: 'perms', label: 'videoTranscode', target: 'policy', key: 'EnableVideoPlaybackTranscoding', vtype: 'boolean', optIn: true, def: true },
                { id: 'remux', group: 'perms', label: 'remux', target: 'policy', key: 'EnablePlaybackRemuxing', vtype: 'boolean', optIn: true, def: true },
                { id: 'remoteBitrate', group: 'perms', label: 'remoteBitrate', target: 'policy', key: 'RemoteClientBitrateLimit', vtype: 'number', optIn: true, def: 0, placeholder: '0' },
                { id: 'autoQuality', group: 'perms', label: 'autoQuality', target: 'policy', key: 'AutoRemoteQuality', vtype: 'number', optIn: true, def: 0, placeholder: '0' },
                { id: 'simStreams', group: 'perms', label: 'simStreams', target: 'policy', key: 'SimultaneousStreamLimit', vtype: 'number', optIn: true, def: 0, placeholder: '0' },
                { id: 'liveTv', group: 'features', label: 'liveTv', target: 'policy', key: 'EnableLiveTvAccess', vtype: 'boolean', optIn: true, def: false },
                { id: 'liveTvManage', group: 'features', label: 'liveTvManage', target: 'policy', key: 'EnableLiveTvManagement', vtype: 'boolean', optIn: true, def: false },
                { id: 'deleteContent', group: 'features', label: 'deleteContent', target: 'policy', key: 'EnableContentDeletion', vtype: 'boolean', optIn: true, def: false },
                { id: 'deleteFrom', group: 'features', label: 'deleteFrom', target: 'policy', key: 'EnableContentDeletionFromFolders', vtype: 'json', optIn: true, def: [], kind: 'libexcl' },
                { id: 'remoteControl', group: 'features', label: 'remoteControl', target: 'policy', key: 'EnableRemoteControlOfOtherUsers', vtype: 'boolean', optIn: true, def: false },
                { id: 'sharedDevice', group: 'features', label: 'sharedDevice', target: 'policy', key: 'EnableSharedDeviceControl', vtype: 'boolean', optIn: true, def: false },
                { id: 'download', group: 'features', label: 'download', target: 'policy', key: 'EnableContentDownloading', vtype: 'boolean', optIn: true, def: false },
                { id: 'downloadTranscode', group: 'features', label: 'downloadTranscode', target: 'policy', key: 'EnableSyncTranscoding', vtype: 'boolean', optIn: true, def: false },
                { id: 'subDownload', group: 'features', label: 'subDownload', target: 'policy', key: 'EnableSubtitleDownloading', vtype: 'boolean', optIn: true, def: false },
                { id: 'subManage', group: 'features', label: 'subManage', target: 'policy', key: 'EnableSubtitleManagement', vtype: 'boolean', optIn: true, def: false },
                { id: 'cameraUpload', group: 'features', label: 'cameraUpload', target: 'policy', key: 'AllowCameraUpload', vtype: 'boolean', optIn: true, def: false },
                { id: 'mediaConversion', group: 'features', label: 'mediaConversion', target: 'policy', key: 'EnableMediaConversion', vtype: 'boolean', optIn: true, def: false },
                { id: 'sharePersonal', group: 'features', label: 'sharePersonal', target: 'policy', key: 'AllowSharingPersonalItems', vtype: 'boolean', optIn: true, def: false },
                { id: 'publicSharing', group: 'features', label: 'publicSharing', target: 'policy', key: 'EnablePublicSharing', vtype: 'boolean', optIn: true, def: false },
                { id: 'allFolders', group: 'access', label: 'allFolders', target: 'policy', key: 'EnableAllFolders', vtype: 'boolean', optIn: true, def: true },
                { id: 'enabledFolders', group: 'access', label: 'enabledFolders', target: 'policy', key: 'EnabledFolders', vtype: 'json', optIn: true, def: [], kind: 'libexcl' },
                { id: 'allDevices', group: 'access', label: 'allDevices', target: 'policy', key: 'EnableAllDevices', vtype: 'boolean', optIn: true, def: true },
                { id: 'maxRating', group: 'access', label: 'maxRating', target: 'policy', key: 'MaxParentalRating', vtype: 'number', optIn: true, def: null, placeholder: '' },
                { id: 'blockUnrated', group: 'access', label: 'blockUnrated', target: 'policy', key: 'BlockUnratedItems', vtype: 'json', optIn: true, def: [], kind: 'unrated' },
                { id: 'blockedTags', group: 'access', label: 'blockedTags', target: 'policy', key: 'BlockedTags', vtype: 'json', optIn: true, def: [], kind: 'taglist', placeholder: 'tag1, tag2' },
                { id: 'includeTags', group: 'access', label: 'includeTags', target: 'policy', key: 'IncludeTags', vtype: 'json', optIn: true, def: [], kind: 'taglist', placeholder: 'tag1, tag2' },
                { id: 'tagInclusive', group: 'access', label: 'tagInclusive', target: 'policy', key: 'IsTagBlockingModeInclusive', vtype: 'boolean', optIn: true, def: false },
                { id: 'remSubs', group: 'subs', label: 'rememberSubs', target: 'config', key: 'RememberSubtitleSelections', vtype: 'boolean', def: true }
            ];
            var GROUPS = ['display', 'detail', 'home', 'sound', 'playback', 'subs', 'account', 'perms', 'features', 'access'];
            // Default screen per library is stored as landing-<libraryId>.
            function landingDefs() {
                var list = [], seen = {};
                views.forEach(function (v) {
                    var ct = String(v.CollectionType || '').toLowerCase();
                    var key = 'landing-' + v.Id;
                    if (ct === 'movies' || ct === 'tvshows' || obs.prefs[key]) { seen[key] = true; list.push({ id: key, group: 'home', title: v.Name + ': ' + t('defaultScreen'), target: 'prefs', key: key, def: '', dyn: true }); }
                });
                return list;
            }
            var EXCLUDE = /password|pincode|profilepin|^pin$|localpassword|^id$|^serverid$/i;
            // Per-library view state and device hints: not useful to copy between users.
            var NOISE = /^landing-|groupby|groupitems|^atv_pref|lastplaylistid|^subtitleeditor|^items-|^\d+-\d+-|^devices-|^apikeys-|^playlisteditor|-(groupBy|sortBy|sortOrder|viewType|imageType)/i;

            var translations = {
                en: {
                    title: 'Emby User Settings Manager',
                    intro: 'Choose the settings, tick the users and apply. Only checked settings are changed; everything else is preserved. You can save the selection as a preset. Uses the signed-in dashboard session; no API key is stored.',
                    presets: 'Presets', noPreset: '— No preset (current selection) —', presetName: 'Preset name', savePreset: 'Save preset', deletePreset: 'Delete preset',
                    loadFromUser: 'Copy settings from a user (optional)', loadFromUserNote: 'Fills the settings below with the values of an existing user, so you can copy them to others or save them as a preset.', loadSettings: 'Load settings', pickUser: '— Choose a user —',
                    diag: 'Copy detected keys (diagnostics)', diagDone: 'Detected keys are shown below; copy them if you want to share them.',
                    loaded: 'Loaded settings from {0}. {1} setting(s) are not stored for this user and were unchecked.', presetLoaded: 'Preset “{0}” loaded.', presetSaved: 'Preset “{0}” saved ({1} settings).', presetDeleted: 'Preset deleted.', presetsFailed: 'Could not load or save presets: {0}', presetNameNeeded: 'Enter a preset name.', presetEmpty: 'Check at least one setting before saving a preset.', presetOverwrite: 'A preset named “{0}” already exists. Overwrite it?', presetDelete: 'Delete preset “{0}”?', selectPresetFirst: 'Select a preset to delete.',
                    targetGroup: 'Target users', reloadUsers: 'Reload users', selectAll: 'Select all', selectNone: 'Select none', loadingUsers: 'Loading users…', selectedCount: '{0} of {1} users selected',
                    settingsTitle: 'Settings', settingsNote: 'All settings are checked by default; only checked settings are applied. Uncheck what you do not want to change.', checkAll: 'Check all', checkNone: 'Uncheck all', discovering: 'Reading the settings stored for your users…', discovered: 'Ready. {0} setting(s) could not be matched on this server (greyed out).',
                    display: 'Display', detail: 'Detail screens', home: 'Home & library', sound: 'Sound', playback: 'Advanced', subs: 'Subtitles',
                    episodessingleseason: 'Episodes of one season', pinPlaceholder: '4 digits', theme: 'Theme', settingsTheme: 'Settings theme', accentColor: 'Accent color', audioBackdrop: 'Now playing audio backdrop style', tvView: 'Preferred view for TV series', singleFolder: 'Automatically open single items in folder view', spoiler: 'Hide spoiler information for unwatched episodes',
                    hidePlayedMore: 'Hide played media in: More like this', hidePlayedSuggestions: 'Hide played media in: Suggestions', hidePlayedLatest: 'Hide played media in: Latest',
                    logoAsTitles: 'Show logo images as titles on detail screens', posterDetail: 'Show a poster on the detail screen', genreLimit: 'Genre display limit', genreLimitLists: 'Genre display limit for lists', fullMedia: 'Show full media below audio and video detail screens',
                    homeSection: 'Home section {0}', focusPreviews: 'Home screen focus previews', libraryOrder: 'Library order', defMovies: 'Movies: default screen', defSeries: 'Series: default screen', displayMissingEpisodes: 'Show missing episodes',
                    secNone: 'None', secLibrary: 'My media', secLibraryButtons: 'My media (buttons)', secResume: 'Continue watching', secResumeAudio: 'Continue listening', secLatest: 'Latest media', secNextUp: 'Next up', secLiveTv: 'Live TV', secRecordings: 'Active recordings', homeSections: 'Home sections', myMediaExcludes: 'My media: hide libraries', latestExcludes: 'Latest media: exclude libraries', addSection: 'Add', removeSection: 'Remove', profile: 'Profile', profilePin: 'Profile PIN code', account: 'Profile & account', perms: 'Playback (permissions)', features: 'Feature access', access: 'Access & parental control', isAdmin: 'This user can administer the server', remoteAccess: 'Allow remote connections to this Emby Server', userPrefs: 'Allow the user to change their own password and profile picture', isDisabled: 'Disable this account', isHidden: 'Hide this user on login screens on the local network', isHiddenRemotely: 'Hide this user on login screens for remote connections', isHiddenUnused: 'Hide this user on devices where they have never signed in', mediaPlayback: 'Allow media playback', audioTranscode: 'Allow audio transcoding when needed', videoTranscode: 'Allow video transcoding when needed', remux: 'Allow container format changes when needed', remoteBitrate: 'Bitrate limit per stream outside the network (bit/s, 0 = none)', autoQuality: 'Streaming quality when the player is on auto quality (0 = none)', simStreams: 'Maximum simultaneous streams (0 = unlimited)', liveTv: 'Live TV', liveTvManage: 'Manage Live TV recordings', deleteContent: 'Allow deleting media (all libraries)', deleteFrom: 'Allow deleting media from (libraries)', remoteControl: 'Allow remote control of other users', sharedDevice: 'Allow remote control of shared devices', download: 'Allow media downloads', downloadTranscode: 'Allow downloads that require transcoding', subDownload: 'Allow subtitle downloads', subManage: 'Allow deleting existing subtitles', cameraUpload: 'Allow camera upload', mediaConversion: 'Allow media conversion', sharePersonal: 'Allow sharing personal content such as playlists with other users', publicSharing: 'Allow sharing on social media', allFolders: 'Access to all libraries', enabledFolders: 'Allowed libraries', allDevices: 'Access from all devices', maxRating: 'Maximum parental rating (number, empty = none)', blockUnrated: 'Block unrated items', blockedTags: 'Blocked tags (comma-separated)', includeTags: 'Allowed tags (comma-separated)', tagInclusive: 'Use tags as an allow list', adminOnly: 'This page is only available to Emby administrators. Sign in with an administrator account.', adminWarn: 'You are about to make the selected users administrators and/or disable their accounts. Continue?', lockout: 'You cannot disable your own account or remove your own administrator rights.', badPin: 'A PIN code must be exactly 4 digits (or empty).', secPlaylists: 'Playlists', defaultScreen: 'Default screen', bgBackdrop: 'Backdrop', bgBlur: 'Primary image blur',
                    audioLanguage: 'Preferred audio language', playDefaultAudio: 'Play default audio track regardless of language', rememberAudio: 'Remember audio track selections',
                    autoplayNext: 'Automatically play next episode', nextPreview: 'Show next video preview', skipForward: 'Skip forward length', skipBack: 'Skip back length', resumeRewind: 'Automatically rewind on resume', rewindNone: 'None', skipIntros: 'Skip intros', stillWatching: '“Are you still watching?” reminder', ratingInfo: 'Show rating info when starting video playback', upAction: 'Video player up action',
                    subtitleLanguage: 'Preferred subtitle language', subtitleMode: 'Subtitle mode', subSkipBack: 'Show subtitles on skip back', subLowVolume: 'Show subtitles on low volume', rememberSubs: 'Remember subtitle track selection',
                    subDefault: 'Default', subSmart: 'Smart', subForced: 'Only forced', subAlways: 'Always', on: 'On', off: 'Off', autoSkip: 'Automatically skip', showButton: 'Show button',
                    otherSettings: 'Other settings', otherNote: 'More settings stored on your server that are not listed above, shown under their internal names. Unchecked by default.', filter: 'Filter by name…', noOther: 'No other settings found.',
                    notFound: 'not found on this server', moveUp: 'Move up', moveDown: 'Move down',
                    apply: 'Apply', applyToUsers: 'Apply to selected users', noUsers: 'No users found.', loading: 'Loading…', usersLoaded: 'Users loaded: {0}', loadFailed: 'Could not load users. Check that you are signed in with an Emby administrator account.', apiFailed: 'API request failed.',
                    selectOne: 'Select at least one user.', checkOne: 'Check at least one setting.',
                    confirm: 'You are about to apply {0} setting(s) to {1} user(s):\n{2}\n\nSettings: {3}\n\nContinue?', applying: 'Applying changes…', completed: 'Done. Succeeded: {0} · Failed: {1}',
                    noConfig: 'No user configuration was returned.', verifyFailed: '{0} was not confirmed (got “{1}”).', badValue: 'Invalid value for {0}.', ok: 'OK', error: 'ERROR'
                },
                nl: {
                    title: 'Emby User Settings Manager',
                    intro: 'Kies de instellingen, vink de gebruikers aan en pas toe. Alleen aangevinkte instellingen worden gewijzigd; de rest blijft behouden. Je kunt de selectie als preset opslaan. Gebruikt de ingelogde dashboard-sessie; er wordt geen API-sleutel opgeslagen.',
                    presets: 'Presets', noPreset: '— Geen preset (huidige selectie) —', presetName: 'Naam van preset', savePreset: 'Preset opslaan', deletePreset: 'Preset verwijderen',
                    loadFromUser: 'Instellingen overnemen van een gebruiker (optioneel)', loadFromUserNote: 'Vult de instellingen hieronder met de waarden van een bestaande gebruiker, zodat je ze naar anderen kunt kopiëren of als preset kunt opslaan.', loadSettings: 'Instellingen laden', pickUser: '— Kies een gebruiker —',
                    diag: 'Gevonden sleutels kopiëren (diagnose)', diagDone: 'De gevonden sleutels staan hieronder; kopieer ze als je ze wilt delen.',
                    loaded: 'Instellingen geladen van {0}. {1} instelling(en) zijn niet opgeslagen voor deze gebruiker en uitgevinkt.', presetLoaded: 'Preset “{0}” geladen.', presetSaved: 'Preset “{0}” opgeslagen ({1} instellingen).', presetDeleted: 'Preset verwijderd.', presetsFailed: 'Presets laden of opslaan mislukt: {0}', presetNameNeeded: 'Vul een naam voor de preset in.', presetEmpty: 'Vink ten minste één instelling aan voordat je een preset opslaat.', presetOverwrite: 'Er bestaat al een preset met de naam “{0}”. Overschrijven?', presetDelete: 'Preset “{0}” verwijderen?', selectPresetFirst: 'Selecteer eerst een preset om te verwijderen.',
                    targetGroup: 'Doelgebruikers', reloadUsers: 'Gebruikers opnieuw laden', selectAll: 'Selecteer iedereen', selectNone: 'Selecteer niemand', loadingUsers: 'Gebruikers laden…', selectedCount: '{0} van {1} gebruikers geselecteerd',
                    settingsTitle: 'Instellingen', settingsNote: 'Alle instellingen staan standaard aangevinkt; alleen aangevinkte instellingen worden toegepast. Vink uit wat je niet wilt wijzigen.', checkAll: 'Alles aanvinken', checkNone: 'Alles uitvinken', discovering: 'Bezig met het uitlezen van de instellingen van je gebruikers…', discovered: 'Klaar. {0} instelling(en) konden op deze server niet worden gekoppeld (grijs).',
                    display: 'Weergave', detail: 'Detailschermen', home: 'Home & bibliotheek', sound: 'Geluid', playback: 'Geavanceerd', subs: 'Ondertitels',
                    episodessingleseason: 'Afleveringen van één seizoen', pinPlaceholder: '4 cijfers', theme: 'Thema', settingsTheme: 'Instellingen thema', accentColor: 'Accent kleur', audioBackdrop: 'Nu aan het afspelen audio-achtergrondstijl', tvView: 'Gewenste weergave voor TV series', singleFolder: 'Open enkele items automatisch in folderweergave', spoiler: 'Verberg spoilerinformatie van nog niet bekeken afleveringen',
                    hidePlayedMore: 'Verberg afgespeelde media in: Meer als dit', hidePlayedSuggestions: 'Verberg afgespeelde media in: Suggesties', hidePlayedLatest: 'Verberg afgespeelde media in: Nieuwste',
                    logoAsTitles: 'Geef logoafbeeldingen weer als titels op detailschermen', posterDetail: 'Toon een poster op het detailscherm', genreLimit: 'Weergavelimiet genre', genreLimitLists: 'Weergavelimiet genre voor lijsten', fullMedia: 'Toon volledige media onderaan de audio- en videodetailschermen',
                    homeSection: 'Home sectie {0}', focusPreviews: 'Voorvertoningen bij focus op startscherm', libraryOrder: 'Bibliotheek volgorde', defMovies: 'Films: standaard scherm', defSeries: 'Series: standaard scherm', displayMissingEpisodes: 'Ontbrekende afleveringen tonen',
                    secNone: 'Geen', secLibrary: 'Mijn media', secLibraryButtons: 'Mijn media (knoppen)', secResume: 'Kijken hervatten', secResumeAudio: 'Luisteren hervatten', secLatest: 'Nieuwste media', secNextUp: 'Volgende', secLiveTv: 'Live TV', secRecordings: 'Actieve opnames', homeSections: 'Home secties', myMediaExcludes: 'Mijn media: bibliotheken verbergen', latestExcludes: 'Nieuwste media: bibliotheken uitsluiten', addSection: 'Toevoegen', removeSection: 'Verwijderen', profile: 'Profiel', profilePin: 'Profielpincode', account: 'Profiel & account', perms: 'Afspelen (toestemmingen)', features: 'Functietoegang', access: 'Toegang & ouderlijk toezicht', isAdmin: 'Deze gebruiker kan de server beheren', remoteAccess: 'Externe verbindingen met deze Emby Server toestaan', userPrefs: 'Gebruiker mag eigen wachtwoord en profielafbeelding wijzigen', isDisabled: 'Dit account uitschakelen', isHidden: 'Verberg deze gebruiker op de aanmeldschermen op het lokale netwerk', isHiddenRemotely: 'Verberg deze gebruiker op de aanmeldschermen voor externe verbindingen', isHiddenUnused: 'Verberg deze gebruiker op toestellen waar deze nog nooit is aangemeld', mediaPlayback: 'Media afspelen toestaan', audioTranscode: 'Audio-transcodering toestaan, indien nodig', videoTranscode: 'Video-transcodering toestaan, indien nodig', remux: 'Wijziging van containerformaten toestaan, indien nodig', remoteBitrate: 'Bitrate-limiet per stream buiten het netwerk (bit/s, 0 = geen)', autoQuality: 'Streamingkwaliteit bij automatische kwaliteit (0 = geen)', simStreams: 'Maximaal aantal gelijktijdige streams (0 = onbeperkt)', liveTv: 'Live TV', liveTvManage: 'Live TV-opnames beheren', deleteContent: 'Wissen van media toestaan (alle bibliotheken)', deleteFrom: 'Wissen van media toestaan van (bibliotheken)', remoteControl: 'Op afstand besturen van andere gebruikers toestaan', sharedDevice: 'Op afstand besturen van gedeelde apparaten toestaan', download: 'Media downloaden toestaan', downloadTranscode: 'Downloaden van media waarvoor transcodering vereist is toestaan', subDownload: 'Het downloaden van ondertitels toestaan', subManage: 'Verwijderen van bestaande ondertitels toestaan', cameraUpload: 'Camera-upload toestaan', mediaConversion: 'Mediaconversie toestaan', sharePersonal: 'Persoonlijke inhoud (zoals afspeellijsten) delen met andere gebruikers toestaan', publicSharing: 'Delen op social media toestaan', allFolders: 'Toegang tot alle bibliotheken', enabledFolders: 'Toegestane bibliotheken', allDevices: 'Toegang vanaf alle apparaten', maxRating: 'Maximale leeftijdsclassificatie (nummer, leeg = geen)', blockUnrated: 'Items zonder classificatie blokkeren', blockedTags: 'Geblokkeerde tags (komma-gescheiden)', includeTags: 'Toegestane tags (komma-gescheiden)', tagInclusive: 'Tags als toegestane lijst gebruiken', adminOnly: 'Deze pagina is alleen beschikbaar voor Emby-beheerders. Log in met een beheerdersaccount.', adminWarn: 'Je staat op het punt de geselecteerde gebruikers beheerder te maken en/of hun account uit te schakelen. Doorgaan?', lockout: 'Je kunt je eigen account niet uitschakelen of je eigen beheerdersrechten niet verwijderen.', badPin: 'Een pincode moet precies 4 cijfers zijn (of leeg).', secPlaylists: 'Afspeellijsten', defaultScreen: 'Standaard scherm', bgBackdrop: 'Achtergrond', bgBlur: 'Primaire beeldscherpte',
                    audioLanguage: 'Voorkeurs audiotaal', playDefaultAudio: 'Standaard audio spoor afspelen ongeacht de taal', rememberAudio: 'Onthoud de audiotrackselecties',
                    autoplayNext: 'Speel volgende aflevering automatisch', nextPreview: 'Volgende voorbeeld weergeven', skipForward: 'Vooruitspoellengte', skipBack: 'Terugspoellengte', resumeRewind: 'Bij hervatten automatisch terugspoelen', rewindNone: 'Geen', skipIntros: 'Intro overslaan', stillWatching: 'Activeren van ‘Ben je nog aan het kijken?’ herinnering', ratingInfo: 'Geef beoordelingsinformatie weer bij het starten van het afspelen van video', upAction: 'Video player up action',
                    subtitleLanguage: 'Voorkeurstaal ondertitels', subtitleMode: 'Ondertitel mode', subSkipBack: 'Ondertitels tonen bij terugspringen', subLowVolume: 'Ondertitels tonen bij laag volume', rememberSubs: 'Onthoud selectie ondertitelspoor',
                    subDefault: 'Standaard', subSmart: 'Slim', subForced: 'Alleen geforceerd', subAlways: 'Altijd', on: 'Aan', off: 'Uit', autoSkip: 'Automatisch overslaan', showButton: 'Knop tonen',
                    otherSettings: 'Overige instellingen', otherNote: 'Meer instellingen die op je server zijn opgeslagen en hierboven niet staan, onder hun interne naam. Standaard uitgevinkt.', filter: 'Filter op naam…', noOther: 'Geen andere instellingen gevonden.',
                    notFound: 'niet gevonden op deze server', moveUp: 'Omhoog', moveDown: 'Omlaag',
                    apply: 'Toepassen', applyToUsers: 'Toepassen op geselecteerde gebruikers', noUsers: 'Geen gebruikers gevonden.', loading: 'Laden…', usersLoaded: 'Gebruikers geladen: {0}', loadFailed: 'Gebruikers laden mislukt. Controleer of je bent ingelogd met een Emby-beheerdersaccount.', apiFailed: 'API-aanvraag mislukt.',
                    selectOne: 'Selecteer ten minste één gebruiker.', checkOne: 'Vink ten minste één instelling aan.',
                    confirm: 'Je staat op het punt {0} instelling(en) toe te passen op {1} gebruiker(s):\n{2}\n\nInstellingen: {3}\n\nDoorgaan?', applying: 'Wijzigingen worden toegepast…', completed: 'Klaar. Gelukt: {0} · Mislukt: {1}',
                    noConfig: 'Geen gebruikersconfiguratie ontvangen.', verifyFailed: '{0} niet bevestigd (ontvangen: “{1}”).', badValue: 'Ongeldige waarde voor {0}.', ok: 'OK', error: 'FOUT'
                },
                de: {
                    title: "Emby User Settings Manager",
                    intro: "Wähle die Einstellungen, hake die Benutzer an und wende sie an. Nur angehakte Einstellungen werden geändert; alles andere bleibt erhalten. Du kannst die Auswahl als Preset speichern. Verwendet die angemeldete Dashboard-Sitzung; es wird kein API-Schlüssel gespeichert.",
                    presets: "Presets",
                    noPreset: "— Kein Preset (aktuelle Auswahl) —",
                    presetName: "Preset-Name",
                    savePreset: "Preset speichern",
                    deletePreset: "Preset löschen",
                    loadFromUser: "Einstellungen von einem Benutzer übernehmen (optional)",
                    loadFromUserNote: "Füllt die Einstellungen unten mit den Werten eines vorhandenen Benutzers, damit du sie auf andere kopieren oder als Preset speichern kannst.",
                    loadSettings: "Einstellungen laden",
                    pickUser: "— Benutzer auswählen —",
                    diag: "Erkannte Schlüssel kopieren (Diagnose)",
                    diagDone: "Die erkannten Schlüssel werden unten angezeigt; kopiere sie, wenn du sie teilen möchtest.",
                    loaded: "Einstellungen von {0} geladen. {1} Einstellung(en) sind für diesen Benutzer nicht gespeichert und wurden abgewählt.",
                    presetLoaded: "Preset “{0}” geladen.",
                    presetSaved: "Preset “{0}” gespeichert ({1} Einstellungen).",
                    presetDeleted: "Preset gelöscht.",
                    presetsFailed: "Presets konnten nicht geladen oder gespeichert werden: {0}",
                    presetNameNeeded: "Gib einen Preset-Namen ein.",
                    presetEmpty: "Hake mindestens eine Einstellung an, bevor du ein Preset speicherst.",
                    presetOverwrite: "Ein Preset mit dem Namen “{0}” existiert bereits. Überschreiben?",
                    presetDelete: "Preset “{0}” löschen?",
                    selectPresetFirst: "Wähle ein Preset zum Löschen aus.",
                    targetGroup: "Zielbenutzer",
                    reloadUsers: "Benutzer neu laden",
                    selectAll: "Alle auswählen",
                    selectNone: "Keine auswählen",
                    loadingUsers: "Benutzer werden geladen…",
                    selectedCount: "{0} von {1} Benutzern ausgewählt",
                    settingsTitle: "Einstellungen",
                    settingsNote: "Standardmäßig sind alle Einstellungen angehakt; nur angehakte Einstellungen werden angewendet. Entferne den Haken bei dem, was du nicht ändern möchtest.",
                    checkAll: "Alle anhaken",
                    checkNone: "Alle abwählen",
                    discovering: "Die für deine Benutzer gespeicherten Einstellungen werden gelesen…",
                    discovered: "Fertig. {0} Einstellung(en) konnten auf diesem Server nicht zugeordnet werden (ausgegraut).",
                    display: "Anzeige",
                    detail: "Detailansichten",
                    home: "Startbildschirm & Mediathek",
                    sound: "Ton",
                    playback: "Erweitert",
                    subs: "Untertitel",
                    episodessingleseason: "Episoden einer Staffel",
                    pinPlaceholder: "4 Ziffern",
                    theme: "Design",
                    settingsTheme: "Design der Einstellungen",
                    accentColor: "Akzentfarbe",
                    audioBackdrop: "Hintergrundstil für „Aktuelle Wiedergabe“ (Audio)",
                    tvView: "Bevorzugte Ansicht für TV-Serien",
                    singleFolder: "Einzelne Elemente automatisch in der Ordneransicht öffnen",
                    spoiler: "Spoiler-Informationen für ungesehene Episoden ausblenden",
                    hidePlayedMore: "Wiedergegebene Medien ausblenden in: Ähnliche Titel",
                    hidePlayedSuggestions: "Wiedergegebene Medien ausblenden in: Vorschläge",
                    hidePlayedLatest: "Wiedergegebene Medien ausblenden in: Neueste",
                    logoAsTitles: "Logobilder als Titel in Detailansichten anzeigen",
                    posterDetail: "Poster in der Detailansicht anzeigen",
                    genreLimit: "Anzeigelimit für Genres",
                    genreLimitLists: "Anzeigelimit für Genres in Listen",
                    fullMedia: "Vollständige Medien unterhalb der Audio- und Video-Detailansichten anzeigen",
                    homeSection: "Startbildschirm-Bereich {0}",
                    focusPreviews: "Fokus-Vorschauen auf dem Startbildschirm",
                    libraryOrder: "Reihenfolge der Mediathek",
                    defMovies: "Filme: Standardansicht",
                    defSeries: "Serien: Standardansicht",
                    displayMissingEpisodes: "Fehlende Episoden anzeigen",
                    secNone: "Keine",
                    secLibrary: "Meine Medien",
                    secLibraryButtons: "Meine Medien (Schaltflächen)",
                    secResume: "Weiterschauen",
                    secResumeAudio: "Weiterhören",
                    secLatest: "Neueste Medien",
                    secNextUp: "Als Nächstes",
                    secLiveTv: "Live TV",
                    secRecordings: "Aktive Aufnahmen",
                    homeSections: "Startbildschirm-Bereiche",
                    myMediaExcludes: "Meine Medien: Mediatheken ausblenden",
                    latestExcludes: "Neueste Medien: Mediatheken ausschließen",
                    addSection: "Hinzufügen",
                    removeSection: "Entfernen",
                    profile: "Profil",
                    profilePin: "Profil-PIN",
                    account: "Profil & Konto",
                    perms: "Wiedergabe (Berechtigungen)",
                    features: "Funktionszugriff",
                    access: "Zugriff & Jugendschutz",
                    isAdmin: "Dieser Benutzer kann den Server verwalten",
                    remoteAccess: "Fernzugriff auf diesen Emby Server erlauben",
                    userPrefs: "Dem Benutzer erlauben, sein eigenes Passwort und Profilbild zu ändern",
                    isDisabled: "Dieses Konto deaktivieren",
                    isHidden: "Diesen Benutzer auf Anmeldebildschirmen im lokalen Netzwerk ausblenden",
                    isHiddenRemotely: "Diesen Benutzer auf Anmeldebildschirmen bei Fernzugriff ausblenden",
                    isHiddenUnused: "Diesen Benutzer auf Geräten ausblenden, auf denen er sich noch nie angemeldet hat",
                    mediaPlayback: "Medienwiedergabe erlauben",
                    audioTranscode: "Audio-Transkodierung bei Bedarf erlauben",
                    videoTranscode: "Video-Transkodierung bei Bedarf erlauben",
                    remux: "Änderung des Containerformats bei Bedarf erlauben",
                    remoteBitrate: "Bitratenlimit pro Stream außerhalb des Netzwerks (Bit/s, 0 = keins)",
                    autoQuality: "Streamingqualität bei automatischer Qualität des Players (0 = keine)",
                    simStreams: "Maximale gleichzeitige Streams (0 = unbegrenzt)",
                    liveTv: "Live TV",
                    liveTvManage: "Live TV-Aufnahmen verwalten",
                    deleteContent: "Löschen von Medien erlauben (alle Mediatheken)",
                    deleteFrom: "Löschen von Medien erlauben aus (Mediatheken)",
                    remoteControl: "Fernsteuerung anderer Benutzer erlauben",
                    sharedDevice: "Fernsteuerung gemeinsam genutzter Geräte erlauben",
                    download: "Medien-Downloads erlauben",
                    downloadTranscode: "Downloads erlauben, die Transkodierung erfordern",
                    subDownload: "Untertitel-Downloads erlauben",
                    subManage: "Löschen vorhandener Untertitel erlauben",
                    cameraUpload: "Kamera-Upload erlauben",
                    mediaConversion: "Medienkonvertierung erlauben",
                    sharePersonal: "Teilen persönlicher Inhalte wie Wiedergabelisten mit anderen Benutzern erlauben",
                    publicSharing: "Teilen in sozialen Medien erlauben",
                    allFolders: "Zugriff auf alle Mediatheken",
                    enabledFolders: "Erlaubte Mediatheken",
                    allDevices: "Zugriff von allen Geräten",
                    maxRating: "Maximale Altersfreigabe (Zahl, leer = keine)",
                    blockUnrated: "Nicht bewertete Elemente blockieren",
                    blockedTags: "Blockierte Tags (durch Komma getrennt)",
                    includeTags: "Erlaubte Tags (durch Komma getrennt)",
                    tagInclusive: "Tags als Positivliste verwenden",
                    adminOnly: "Diese Seite ist nur für Emby-Administratoren verfügbar. Melde dich mit einem Administratorkonto an.",
                    adminWarn: "Du bist dabei, die ausgewählten Benutzer zu Administratoren zu machen und/oder ihre Konten zu deaktivieren. Fortfahren?",
                    lockout: "Du kannst weder dein eigenes Konto deaktivieren noch dir selbst die Administratorrechte entziehen.",
                    badPin: "Eine PIN muss genau 4 Ziffern lang sein (oder leer).",
                    secPlaylists: "Wiedergabelisten",
                    defaultScreen: "Standardansicht",
                    bgBackdrop: "Hintergrundbild",
                    bgBlur: "Unschärfe des Primärbilds",
                    audioLanguage: "Bevorzugte Audiosprache",
                    playDefaultAudio: "Standard-Audiospur unabhängig von der Sprache wiedergeben",
                    rememberAudio: "Auswahl der Audiospur merken",
                    autoplayNext: "Nächste Episode automatisch wiedergeben",
                    nextPreview: "Vorschau des nächsten Videos anzeigen",
                    skipForward: "Länge des Vorspringens",
                    skipBack: "Länge des Zurückspringens",
                    resumeRewind: "Beim Fortsetzen automatisch zurückspulen",
                    rewindNone: "Keine",
                    skipIntros: "Intros überspringen",
                    stillWatching: "Erinnerung „Schaust du noch?“",
                    ratingInfo: "Bewertungsinfo beim Start der Videowiedergabe anzeigen",
                    upAction: "Aktion „Nach oben“ im Videoplayer",
                    subtitleLanguage: "Bevorzugte Untertitelsprache",
                    subtitleMode: "Untertitelmodus",
                    subSkipBack: "Untertitel beim Zurückspringen anzeigen",
                    subLowVolume: "Untertitel bei niedriger Lautstärke anzeigen",
                    rememberSubs: "Auswahl der Untertitelspur merken",
                    subDefault: "Standard",
                    subSmart: "Intelligent",
                    subForced: "Nur erzwungene",
                    subAlways: "Immer",
                    on: "Ein",
                    off: "Aus",
                    autoSkip: "Automatisch überspringen",
                    showButton: "Schaltfläche anzeigen",
                    otherSettings: "Weitere Einstellungen",
                    otherNote: "Weitere auf deinem Server gespeicherte Einstellungen, die oben nicht aufgeführt sind, angezeigt unter ihren internen Namen. Standardmäßig nicht angehakt.",
                    filter: "Nach Namen filtern…",
                    noOther: "Keine weiteren Einstellungen gefunden.",
                    notFound: "auf diesem Server nicht gefunden",
                    moveUp: "Nach oben",
                    moveDown: "Nach unten",
                    apply: "Anwenden",
                    applyToUsers: "Auf ausgewählte Benutzer anwenden",
                    noUsers: "Keine Benutzer gefunden.",
                    loading: "Wird geladen…",
                    usersLoaded: "Benutzer geladen: {0}",
                    loadFailed: "Benutzer konnten nicht geladen werden. Prüfe, ob du mit einem Emby-Administratorkonto angemeldet bist.",
                    apiFailed: "API-Anfrage fehlgeschlagen.",
                    selectOne: "Wähle mindestens einen Benutzer aus.",
                    checkOne: "Hake mindestens eine Einstellung an.",
                    confirm: "Du bist dabei, {0} Einstellung(en) auf {1} Benutzer anzuwenden:\n{2}\n\nEinstellungen: {3}\n\nFortfahren?",
                    applying: "Änderungen werden angewendet…",
                    completed: "Fertig. Erfolgreich: {0} · Fehlgeschlagen: {1}",
                    noConfig: "Es wurde keine Benutzerkonfiguration zurückgegeben.",
                    verifyFailed: "{0} wurde nicht bestätigt (erhalten: “{1}”).",
                    badValue: "Ungültiger Wert für {0}.",
                    ok: "OK",
                    error: "FEHLER"
                },
                fr: {
                    title: "Emby User Settings Manager",
                    intro: "Choisissez les paramètres, cochez les utilisateurs et appliquez. Seuls les paramètres cochés sont modifiés ; tout le reste est conservé. Vous pouvez enregistrer la sélection comme préréglage. Utilise la session connectée du tableau de bord ; aucune clé API n’est stockée.",
                    presets: "Préréglages",
                    noPreset: "— Aucun préréglage (sélection actuelle) —",
                    presetName: "Nom du préréglage",
                    savePreset: "Enregistrer le préréglage",
                    deletePreset: "Supprimer le préréglage",
                    loadFromUser: "Copier les paramètres d’un utilisateur (facultatif)",
                    loadFromUserNote: "Remplit les paramètres ci-dessous avec les valeurs d’un utilisateur existant, afin de les copier vers d’autres ou de les enregistrer comme préréglage.",
                    loadSettings: "Charger les paramètres",
                    pickUser: "— Choisir un utilisateur —",
                    diag: "Copier les clés détectées (diagnostic)",
                    diagDone: "Les clés détectées sont affichées ci-dessous ; copiez-les si vous souhaitez les partager.",
                    loaded: "Paramètres chargés depuis {0}. {1} paramètre(s) ne sont pas enregistrés pour cet utilisateur et ont été décochés.",
                    presetLoaded: "Préréglage “{0}” chargé.",
                    presetSaved: "Préréglage “{0}” enregistré ({1} paramètres).",
                    presetDeleted: "Préréglage supprimé.",
                    presetsFailed: "Impossible de charger ou d’enregistrer les préréglages : {0}",
                    presetNameNeeded: "Saisissez un nom de préréglage.",
                    presetEmpty: "Cochez au moins un paramètre avant d’enregistrer un préréglage.",
                    presetOverwrite: "Un préréglage nommé “{0}” existe déjà. Le remplacer ?",
                    presetDelete: "Supprimer le préréglage “{0}” ?",
                    selectPresetFirst: "Sélectionnez un préréglage à supprimer.",
                    targetGroup: "Utilisateurs cibles",
                    reloadUsers: "Recharger les utilisateurs",
                    selectAll: "Tout sélectionner",
                    selectNone: "Tout désélectionner",
                    loadingUsers: "Chargement des utilisateurs…",
                    selectedCount: "{0} utilisateur(s) sur {1} sélectionné(s)",
                    settingsTitle: "Paramètres",
                    settingsNote: "Tous les paramètres sont cochés par défaut ; seuls les paramètres cochés sont appliqués. Décochez ce que vous ne voulez pas modifier.",
                    checkAll: "Tout cocher",
                    checkNone: "Tout décocher",
                    discovering: "Lecture des paramètres enregistrés pour vos utilisateurs…",
                    discovered: "Prêt. {0} paramètre(s) n’ont pas pu être associés sur ce serveur (grisés).",
                    display: "Affichage",
                    detail: "Écrans de détails",
                    home: "Écran d’accueil et bibliothèque",
                    sound: "Son",
                    playback: "Avancé",
                    subs: "Sous-titres",
                    episodessingleseason: "Épisodes d’une saison",
                    pinPlaceholder: "4 chiffres",
                    theme: "Thème",
                    settingsTheme: "Thème des paramètres",
                    accentColor: "Couleur d’accentuation",
                    audioBackdrop: "Style de fond audio de la lecture en cours",
                    tvView: "Affichage préféré pour les séries TV",
                    singleFolder: "Ouvrir automatiquement les éléments uniques en vue dossier",
                    spoiler: "Masquer les informations spoiler des épisodes non vus",
                    hidePlayedMore: "Masquer les médias lus dans : Similaires",
                    hidePlayedSuggestions: "Masquer les médias lus dans : Suggestions",
                    hidePlayedLatest: "Masquer les médias lus dans : Derniers ajouts",
                    logoAsTitles: "Afficher les logos comme titres sur les écrans de détails",
                    posterDetail: "Afficher une affiche sur l’écran de détails",
                    genreLimit: "Limite d’affichage des genres",
                    genreLimitLists: "Limite d’affichage des genres pour les listes",
                    fullMedia: "Afficher les médias complets sous les écrans de détails audio et vidéo",
                    homeSection: "Section d’accueil {0}",
                    focusPreviews: "Aperçus au focus sur l’écran d’accueil",
                    libraryOrder: "Ordre des bibliothèques",
                    defMovies: "Films : écran par défaut",
                    defSeries: "Séries : écran par défaut",
                    displayMissingEpisodes: "Afficher les épisodes manquants",
                    secNone: "Aucune",
                    secLibrary: "Mes médias",
                    secLibraryButtons: "Mes médias (boutons)",
                    secResume: "Reprendre la lecture",
                    secResumeAudio: "Reprendre l’écoute",
                    secLatest: "Derniers médias",
                    secNextUp: "À suivre",
                    secLiveTv: "TV en direct",
                    secRecordings: "Enregistrements en cours",
                    homeSections: "Sections d’accueil",
                    myMediaExcludes: "Mes médias : masquer des bibliothèques",
                    latestExcludes: "Derniers médias : exclure des bibliothèques",
                    addSection: "Ajouter",
                    removeSection: "Supprimer",
                    profile: "Profil",
                    profilePin: "Code PIN du profil",
                    account: "Profil et compte",
                    perms: "Lecture (autorisations)",
                    features: "Accès aux fonctionnalités",
                    access: "Accès et contrôle parental",
                    isAdmin: "Cet utilisateur peut administrer le serveur",
                    remoteAccess: "Autoriser les connexions à distance à ce serveur Emby",
                    userPrefs: "Autoriser l’utilisateur à modifier son mot de passe et sa photo de profil",
                    isDisabled: "Désactiver ce compte",
                    isHidden: "Masquer cet utilisateur sur les écrans de connexion du réseau local",
                    isHiddenRemotely: "Masquer cet utilisateur sur les écrans de connexion des connexions à distance",
                    isHiddenUnused: "Masquer cet utilisateur sur les appareils où il ne s’est jamais connecté",
                    mediaPlayback: "Autoriser la lecture des médias",
                    audioTranscode: "Autoriser le transcodage audio si nécessaire",
                    videoTranscode: "Autoriser le transcodage vidéo si nécessaire",
                    remux: "Autoriser le changement de format de conteneur si nécessaire",
                    remoteBitrate: "Limite de débit par flux hors du réseau (bit/s, 0 = aucune)",
                    autoQuality: "Qualité de streaming lorsque le lecteur est en qualité automatique (0 = aucune)",
                    simStreams: "Nombre maximal de flux simultanés (0 = illimité)",
                    liveTv: "TV en direct",
                    liveTvManage: "Gérer les enregistrements de la TV en direct",
                    deleteContent: "Autoriser la suppression de médias (toutes les bibliothèques)",
                    deleteFrom: "Autoriser la suppression de médias depuis (bibliothèques)",
                    remoteControl: "Autoriser le contrôle à distance des autres utilisateurs",
                    sharedDevice: "Autoriser le contrôle à distance des appareils partagés",
                    download: "Autoriser le téléchargement de médias",
                    downloadTranscode: "Autoriser les téléchargements nécessitant un transcodage",
                    subDownload: "Autoriser le téléchargement de sous-titres",
                    subManage: "Autoriser la suppression des sous-titres existants",
                    cameraUpload: "Autoriser l’envoi depuis l’appareil photo",
                    mediaConversion: "Autoriser la conversion de médias",
                    sharePersonal: "Autoriser le partage de contenu personnel, comme les listes de lecture, avec d’autres utilisateurs",
                    publicSharing: "Autoriser le partage sur les réseaux sociaux",
                    allFolders: "Accès à toutes les bibliothèques",
                    enabledFolders: "Bibliothèques autorisées",
                    allDevices: "Accès depuis tous les appareils",
                    maxRating: "Classification parentale maximale (nombre, vide = aucune)",
                    blockUnrated: "Bloquer les éléments non classés",
                    blockedTags: "Tags bloqués (séparés par des virgules)",
                    includeTags: "Tags autorisés (séparés par des virgules)",
                    tagInclusive: "Utiliser les tags comme liste d’autorisation",
                    adminOnly: "Cette page est réservée aux administrateurs Emby. Connectez-vous avec un compte administrateur.",
                    adminWarn: "Vous êtes sur le point de faire des utilisateurs sélectionnés des administrateurs et/ou de désactiver leurs comptes. Continuer ?",
                    lockout: "Vous ne pouvez pas désactiver votre propre compte ni retirer vos propres droits d’administrateur.",
                    badPin: "Un code PIN doit comporter exactement 4 chiffres (ou être vide).",
                    secPlaylists: "Listes de lecture",
                    defaultScreen: "Écran par défaut",
                    bgBackdrop: "Arrière-plan",
                    bgBlur: "Flou de l’image principale",
                    audioLanguage: "Langue audio préférée",
                    playDefaultAudio: "Lire la piste audio par défaut quelle que soit la langue",
                    rememberAudio: "Mémoriser les sélections de pistes audio",
                    autoplayNext: "Lire automatiquement l’épisode suivant",
                    nextPreview: "Afficher l’aperçu de la vidéo suivante",
                    skipForward: "Durée d’avance rapide",
                    skipBack: "Durée de retour arrière",
                    resumeRewind: "Reculer automatiquement à la reprise",
                    rewindNone: "Aucun",
                    skipIntros: "Passer les génériques d’intro",
                    stillWatching: "Rappel “Vous regardez toujours ?”",
                    ratingInfo: "Afficher la classification au démarrage de la lecture vidéo",
                    upAction: "Action « haut » du lecteur vidéo",
                    subtitleLanguage: "Langue de sous-titres préférée",
                    subtitleMode: "Mode des sous-titres",
                    subSkipBack: "Afficher les sous-titres lors d’un retour arrière",
                    subLowVolume: "Afficher les sous-titres lorsque le volume est bas",
                    rememberSubs: "Mémoriser la sélection de la piste de sous-titres",
                    subDefault: "Par défaut",
                    subSmart: "Intelligent",
                    subForced: "Forcés uniquement",
                    subAlways: "Toujours",
                    on: "Activé",
                    off: "Désactivé",
                    autoSkip: "Passer automatiquement",
                    showButton: "Afficher le bouton",
                    otherSettings: "Autres paramètres",
                    otherNote: "Autres paramètres enregistrés sur votre serveur et non listés ci-dessus, affichés sous leurs noms internes. Décochés par défaut.",
                    filter: "Filtrer par nom…",
                    noOther: "Aucun autre paramètre trouvé.",
                    notFound: "introuvable sur ce serveur",
                    moveUp: "Monter",
                    moveDown: "Descendre",
                    apply: "Appliquer",
                    applyToUsers: "Appliquer aux utilisateurs sélectionnés",
                    noUsers: "Aucun utilisateur trouvé.",
                    loading: "Chargement…",
                    usersLoaded: "Utilisateurs chargés : {0}",
                    loadFailed: "Impossible de charger les utilisateurs. Vérifiez que vous êtes connecté avec un compte administrateur Emby.",
                    apiFailed: "Échec de la requête API.",
                    selectOne: "Sélectionnez au moins un utilisateur.",
                    checkOne: "Cochez au moins un paramètre.",
                    confirm: "Vous êtes sur le point d’appliquer {0} paramètre(s) à {1} utilisateur(s) :\n{2}\n\nParamètres : {3}\n\nContinuer ?",
                    applying: "Application des modifications…",
                    completed: "Terminé. Réussites : {0} · Échecs : {1}",
                    noConfig: "Aucune configuration utilisateur n’a été renvoyée.",
                    verifyFailed: "{0} n’a pas été confirmé (reçu : “{1}”).",
                    badValue: "Valeur non valide pour {0}.",
                    ok: "OK",
                    error: "ERREUR"
                },
                es: {
                    title: "Emby User Settings Manager",
                    intro: "Elige los ajustes, marca los usuarios y aplica. Solo se modifican los ajustes marcados; todo lo demás se conserva. Puedes guardar la selección como preajuste. Usa la sesión iniciada del panel de control; no se almacena ninguna clave de API.",
                    presets: "Preajustes",
                    noPreset: "— Sin preajuste (selección actual) —",
                    presetName: "Nombre del preajuste",
                    savePreset: "Guardar preajuste",
                    deletePreset: "Eliminar preajuste",
                    loadFromUser: "Copiar ajustes de un usuario (opcional)",
                    loadFromUserNote: "Rellena los ajustes de abajo con los valores de un usuario existente, para copiarlos a otros o guardarlos como preajuste.",
                    loadSettings: "Cargar ajustes",
                    pickUser: "— Elige un usuario —",
                    diag: "Copiar claves detectadas (diagnóstico)",
                    diagDone: "Las claves detectadas se muestran abajo; cópialas si quieres compartirlas.",
                    loaded: "Ajustes cargados de {0}. {1} ajuste(s) no están almacenados para este usuario y se han desmarcado.",
                    presetLoaded: "Preajuste “{0}” cargado.",
                    presetSaved: "Preajuste “{0}” guardado ({1} ajustes).",
                    presetDeleted: "Preajuste eliminado.",
                    presetsFailed: "No se pudieron cargar o guardar los preajustes: {0}",
                    presetNameNeeded: "Introduce un nombre para el preajuste.",
                    presetEmpty: "Marca al menos un ajuste antes de guardar un preajuste.",
                    presetOverwrite: "Ya existe un preajuste llamado “{0}”. ¿Sobrescribirlo?",
                    presetDelete: "¿Eliminar el preajuste “{0}”?",
                    selectPresetFirst: "Selecciona un preajuste para eliminar.",
                    targetGroup: "Usuarios de destino",
                    reloadUsers: "Recargar usuarios",
                    selectAll: "Seleccionar todo",
                    selectNone: "No seleccionar ninguno",
                    loadingUsers: "Cargando usuarios…",
                    selectedCount: "{0} de {1} usuarios seleccionados",
                    settingsTitle: "Ajustes",
                    settingsNote: "Todos los ajustes están marcados por defecto; solo se aplican los marcados. Desmarca lo que no quieras cambiar.",
                    checkAll: "Marcar todo",
                    checkNone: "Desmarcar todo",
                    discovering: "Leyendo los ajustes almacenados de tus usuarios…",
                    discovered: "Listo. {0} ajuste(s) no se pudieron asociar en este servidor (en gris).",
                    display: "Pantalla",
                    detail: "Pantallas de detalles",
                    home: "Inicio y biblioteca",
                    sound: "Sonido",
                    playback: "Avanzado",
                    subs: "Subtítulos",
                    episodessingleseason: "Episodios de una temporada",
                    pinPlaceholder: "4 dígitos",
                    theme: "Tema",
                    settingsTheme: "Tema de los ajustes",
                    accentColor: "Color de énfasis",
                    audioBackdrop: "Estilo de fondo de audio en reproducción",
                    tvView: "Vista preferida para series de TV",
                    singleFolder: "Abrir automáticamente elementos únicos en vista de carpeta",
                    spoiler: "Ocultar información con spoilers de episodios no vistos",
                    hidePlayedMore: "Ocultar contenido reproducido en: Más como esto",
                    hidePlayedSuggestions: "Ocultar contenido reproducido en: Sugerencias",
                    hidePlayedLatest: "Ocultar contenido reproducido en: Últimos",
                    logoAsTitles: "Mostrar logotipos como títulos en las pantallas de detalles",
                    posterDetail: "Mostrar un póster en la pantalla de detalles",
                    genreLimit: "Límite de géneros mostrados",
                    genreLimitLists: "Límite de géneros mostrados en listas",
                    fullMedia: "Mostrar medios completos bajo las pantallas de detalles de audio y vídeo",
                    homeSection: "Sección de inicio {0}",
                    focusPreviews: "Vistas previas al enfocar en la pantalla de inicio",
                    libraryOrder: "Orden de las bibliotecas",
                    defMovies: "Películas: pantalla predeterminada",
                    defSeries: "Series: pantalla predeterminada",
                    displayMissingEpisodes: "Mostrar episodios que faltan",
                    secNone: "Ninguna",
                    secLibrary: "Mis medios",
                    secLibraryButtons: "Mis medios (botones)",
                    secResume: "Continuar viendo",
                    secResumeAudio: "Continuar escuchando",
                    secLatest: "Últimos medios",
                    secNextUp: "A continuación",
                    secLiveTv: "TV en directo",
                    secRecordings: "Grabaciones activas",
                    homeSections: "Secciones de inicio",
                    myMediaExcludes: "Mis medios: ocultar bibliotecas",
                    latestExcludes: "Últimos medios: excluir bibliotecas",
                    addSection: "Añadir",
                    removeSection: "Quitar",
                    profile: "Perfil",
                    profilePin: "Código PIN del perfil",
                    account: "Perfil y cuenta",
                    perms: "Reproducción (permisos)",
                    features: "Acceso a funciones",
                    access: "Acceso y control parental",
                    isAdmin: "Este usuario puede administrar el servidor",
                    remoteAccess: "Permitir conexiones remotas a este Emby Server",
                    userPrefs: "Permitir al usuario cambiar su propia contraseña y foto de perfil",
                    isDisabled: "Deshabilitar esta cuenta",
                    isHidden: "Ocultar este usuario en las pantallas de inicio de sesión de la red local",
                    isHiddenRemotely: "Ocultar este usuario en las pantallas de inicio de sesión de conexiones remotas",
                    isHiddenUnused: "Ocultar este usuario en dispositivos donde nunca ha iniciado sesión",
                    mediaPlayback: "Permitir la reproducción de medios",
                    audioTranscode: "Permitir la transcodificación de audio cuando sea necesario",
                    videoTranscode: "Permitir la transcodificación de vídeo cuando sea necesario",
                    remux: "Permitir cambios del formato de contenedor cuando sea necesario",
                    remoteBitrate: "Límite de velocidad de bits por transmisión fuera de la red (bit/s, 0 = ninguno)",
                    autoQuality: "Calidad de transmisión cuando el reproductor está en calidad automática (0 = ninguno)",
                    simStreams: "Máximo de transmisiones simultáneas (0 = ilimitado)",
                    liveTv: "TV en directo",
                    liveTvManage: "Administrar grabaciones de TV en directo",
                    deleteContent: "Permitir eliminar medios (todas las bibliotecas)",
                    deleteFrom: "Permitir eliminar medios de (bibliotecas)",
                    remoteControl: "Permitir el control remoto de otros usuarios",
                    sharedDevice: "Permitir el control remoto de dispositivos compartidos",
                    download: "Permitir descargas de medios",
                    downloadTranscode: "Permitir descargas que requieran transcodificación",
                    subDownload: "Permitir descargas de subtítulos",
                    subManage: "Permitir eliminar subtítulos existentes",
                    cameraUpload: "Permitir subir desde la cámara",
                    mediaConversion: "Permitir la conversión de medios",
                    sharePersonal: "Permitir compartir contenido personal, como listas de reproducción, con otros usuarios",
                    publicSharing: "Permitir compartir en redes sociales",
                    allFolders: "Acceso a todas las bibliotecas",
                    enabledFolders: "Bibliotecas permitidas",
                    allDevices: "Acceso desde todos los dispositivos",
                    maxRating: "Clasificación parental máxima (número, vacío = ninguna)",
                    blockUnrated: "Bloquear elementos sin clasificar",
                    blockedTags: "Etiquetas bloqueadas (separadas por comas)",
                    includeTags: "Etiquetas permitidas (separadas por comas)",
                    tagInclusive: "Usar las etiquetas como lista de permitidos",
                    adminOnly: "Esta página solo está disponible para administradores de Emby. Inicia sesión con una cuenta de administrador.",
                    adminWarn: "Estás a punto de convertir a los usuarios seleccionados en administradores y/o deshabilitar sus cuentas. ¿Continuar?",
                    lockout: "No puedes deshabilitar tu propia cuenta ni quitarte tus derechos de administrador.",
                    badPin: "Un código PIN debe tener exactamente 4 dígitos (o estar vacío).",
                    secPlaylists: "Listas de reproducción",
                    defaultScreen: "Pantalla predeterminada",
                    bgBackdrop: "Fondo",
                    bgBlur: "Desenfoque de la imagen principal",
                    audioLanguage: "Idioma de audio preferido",
                    playDefaultAudio: "Reproducir la pista de audio predeterminada sin importar el idioma",
                    rememberAudio: "Recordar la selección de pista de audio",
                    autoplayNext: "Reproducir automáticamente el siguiente episodio",
                    nextPreview: "Mostrar vista previa del siguiente vídeo",
                    skipForward: "Duración del avance",
                    skipBack: "Duración del retroceso",
                    resumeRewind: "Retroceder automáticamente al reanudar",
                    rewindNone: "Ninguno",
                    skipIntros: "Omitir introducciones",
                    stillWatching: "Recordatorio “¿Sigues viendo?”",
                    ratingInfo: "Mostrar la clasificación al iniciar la reproducción de vídeo",
                    upAction: "Acción de flecha arriba en el reproductor de vídeo",
                    subtitleLanguage: "Idioma de subtítulos preferido",
                    subtitleMode: "Modo de subtítulos",
                    subSkipBack: "Mostrar subtítulos al retroceder",
                    subLowVolume: "Mostrar subtítulos con volumen bajo",
                    rememberSubs: "Recordar la selección de pista de subtítulos",
                    subDefault: "Predeterminado",
                    subSmart: "Inteligente",
                    subForced: "Solo forzados",
                    subAlways: "Siempre",
                    on: "Activado",
                    off: "Desactivado",
                    autoSkip: "Omitir automáticamente",
                    showButton: "Mostrar botón",
                    otherSettings: "Otros ajustes",
                    otherNote: "Más ajustes almacenados en tu servidor que no aparecen arriba, mostrados con sus nombres internos. Sin marcar por defecto.",
                    filter: "Filtrar por nombre…",
                    noOther: "No se encontraron otros ajustes.",
                    notFound: "no encontrado en este servidor",
                    moveUp: "Subir",
                    moveDown: "Bajar",
                    apply: "Aplicar",
                    applyToUsers: "Aplicar a los usuarios seleccionados",
                    noUsers: "No se encontraron usuarios.",
                    loading: "Cargando…",
                    usersLoaded: "Usuarios cargados: {0}",
                    loadFailed: "No se pudieron cargar los usuarios. Comprueba que has iniciado sesión con una cuenta de administrador de Emby.",
                    apiFailed: "Error en la solicitud a la API.",
                    selectOne: "Selecciona al menos un usuario.",
                    checkOne: "Marca al menos un ajuste.",
                    confirm: "Estás a punto de aplicar {0} ajuste(s) a {1} usuario(s):\n{2}\n\nAjustes: {3}\n\n¿Continuar?",
                    applying: "Aplicando cambios…",
                    completed: "Hecho. Correctos: {0} · Fallidos: {1}",
                    noConfig: "No se devolvió ninguna configuración de usuario.",
                    verifyFailed: "{0} no se confirmó (se obtuvo “{1}”).",
                    badValue: "Valor no válido para {0}.",
                    ok: "OK",
                    error: "ERROR"
                }
            };

            function byId(id) { return page.querySelector('#' + id); }
            var LANGS = ['en', 'nl', 'de', 'fr', 'es'];
            var embyCulture = '';
            var refreshLangUI = function () { };
            function detectLanguage() {
                var c = [];
                try { var g = (typeof require === 'function' && require.defined && require.defined('globalize')) ? require('globalize') : window.Globalize; if (g && g.getCurrentLocale) c.push(g.getCurrentLocale()); } catch (x) { }
                try { var al = window.localStorage.getItem('language'); if (al) c.push(al); } catch (x) { }
                if (document.documentElement && document.documentElement.lang) c.push(document.documentElement.lang);
                if (embyCulture) c.push(embyCulture);
                for (var i = 0; i < c.length; i++) { var code = String(c[i]).toLowerCase().split(/[-_]/)[0]; if (LANGS.indexOf(code) >= 0) return code; }
                return 'en';
            }
            var language = detectLanguage();
            try { var savedLang = window.localStorage.getItem('eus-lang'); if (LANGS.indexOf(savedLang) >= 0) language = savedLang; } catch (x) { }
            function t(key, args) {
                var v = (translations[language] && translations[language][key]) || translations.en[key] || key;
                if (args) for (var i = 0; i < args.length; i++) v = v.split('{' + i + '}').join(args[i]);
                return v;
            }
            function label(key) { return (translations[language] && translations[language][key]) || translations.en[key] || key; }
            function localizePage() {
                Array.prototype.forEach.call(page.querySelectorAll('[data-i18n]'), function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
                Array.prototype.forEach.call(page.querySelectorAll('[data-i18n-placeholder]'), function (n) { n.placeholder = t(n.getAttribute('data-i18n-placeholder')); });
                try { var srcSel = byId('eus-source-user'); if (srcSel && srcSel.options.length) srcSel.options[0].textContent = t('pickUser'); updateCount(); } catch (x) { }
            }
            function apiGet(path) { return ApiClient.ajax({ url: ApiClient.getUrl(path), type: 'GET', dataType: 'json' }); }
            function apiPost(path, data) { return ApiClient.ajax({ url: ApiClient.getUrl(path), type: 'POST', contentType: 'application/json', data: JSON.stringify(data) }); }
            function setStatus(m, isError) { var n = byId('eus-status'); n.textContent = m || ''; n.className = 'eus-status ' + (isError ? 'eus-error' : 'eus-ok'); }
            function note(m) { byId('eus-load-status').textContent = m || ''; }
            function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
            function norm(v) { if (v === null || v === undefined) return ''; if (typeof v === 'object') return JSON.stringify(v); return String(v); }
            function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

            // ---------------------------------------------------------------
            // Discovery: read every user's stored settings once, so we know
            // which keys exist on this server and what values are in use.
            // ---------------------------------------------------------------
            function record(target, key, value) {
                var bag = obs[target]; var o = bag[key] || (bag[key] = { counts: {}, values: {} });
                var n = norm(value); o.counts[n] = (o.counts[n] || 0) + 1; o.values[n] = value;
            }
            function mostCommon(target, key) {
                var o = obs[target][key]; if (!o) return undefined;
                var best = null, bestN = -1;
                Object.keys(o.counts).forEach(function (k) { if (o.counts[k] > bestN) { best = k; bestN = o.counts[k]; } });
                return o.values[best];
            }
            function observedStrings(target, key) {
                var o = obs[target][key]; return o ? Object.keys(o.values).filter(function (v) { return v !== '' && v.length < 60; }).slice(0, 15) : [];
            }
            function discover() {
                setStatus(t('discovering'), false);
                var adminId = (ApiClient.getCurrentUserId && ApiClient.getCurrentUserId()) || null;
                var jobs = users.map(function (u) {
                    var id = encodeURIComponent(u.Id);
                    return Promise.all([apiGet('Users/' + id), apiGet('DisplayPreferences/usersettings?userId=' + id + '&client=emby')]).then(function (r) {
                        var cfg = (r[0] && r[0].Configuration) || {}, cp = (r[1] && r[1].CustomPrefs) || {}, pol = (r[0] && r[0].Policy) || {};
                        Object.keys(cfg).forEach(function (k) { record('config', k, cfg[k]); });
                        Object.keys(cp).forEach(function (k) { record('prefs', k, cp[k]); });
                        Object.keys(pol).forEach(function (k) { record('policy', k, pol[k]); });
                        if (u.Id === adminId) { adminData.config = cfg; adminData.prefs = cp; adminData.policy = pol; }
                    }).catch(function () { });
                });
                var viewsJob = apiGet('Users/' + encodeURIComponent(adminId || (users[0] && users[0].Id) || '') + '/Views').then(function (r) {
                    views = (r && r.Items) || (Array.isArray(r) ? r : []);
                }).catch(function () { views = []; });
                return Promise.all(jobs.concat([viewsJob])).then(function () { discovered = true; resolveAliases(); });
            }
            function resolveAliases() {
                var claimed = {};
                DEFS.forEach(function (d) { if (d.key) claimed[d.target + ':' + d.key] = true; });
                var order = DEFS.filter(function (d) { return d.alias; }).sort(function (a, b) { return (b.resolveFirst ? 1 : 0) - (a.resolveFirst ? 1 : 0); });
                order.forEach(function (d) {
                    d.key = null;
                    var keys = Object.keys(obs[d.target]).sort();
                    for (var i = 0; i < keys.length; i++) {
                        if (claimed[d.target + ':' + keys[i]]) continue;
                        if (d.alias.test(keys[i])) { d.key = keys[i]; claimed[d.target + ':' + keys[i]] = true; break; }
                    }
                });
            }

            // ---------------------------------------------------------------
            // Editor model
            // ---------------------------------------------------------------
            function vtypeOf(target, value) {
                if (target === 'prefs') return 'string';
                if (typeof value === 'boolean') return 'boolean';
                if (typeof value === 'number') return 'number';
                if (value !== null && typeof value === 'object') return 'json';
                return 'string';
            }
            function makeEntry(o) {
                return { uid: ++uidCounter, target: o.target, key: o.key, vtype: o.vtype || vtypeOf(o.target, o.value), value: o.value, checked: o.checked !== false,
                    label: o.label || null, title: o.title || null, n: o.n, group: o.group || null, options: o.options || null, placeholder: o.placeholder || '', nullable: o.value === null,
                    missing: !!o.missing, kind: o.kind || null, alias: !!o.alias, optIn: !!o.optIn, sensitive: !!o.sensitive, pattern: o.pattern || null, alsoKeys: o.alsoKeys || null, i18nPlaceholder: !!o.i18nPlaceholder };
            }
            function anyHome(prefs) { for (var i = 0; i < 7; i++) if (has(prefs, 'homesection' + i)) return true; return false; }
            function modeHome() { var o = {}; for (var i = 0; i < 7; i++) { var v = mostCommon('prefs', 'homesection' + i); if (v !== undefined) o['homesection' + i] = v; } return o; }
            function homeValue(prefs) { var out = []; for (var i = 0; i < 7; i++) { var v = prefs['homesection' + i]; if (v !== undefined && v !== '' && v !== 'none') out.push(v); } return out; }
            // Build the editor list. o.source = {config,prefs} of a chosen user, o.checked default, o.noExtras.
            function buildEntries(o) {
                var list = [], covered = {};
                DEFS.concat(landingDefs()).forEach(function (d) {
                    if (d.target === 'policy' && discovered && !obs.policy[d.key] && !o.source) return; // not offered by this server version
                    var unresolved = !d.key;
                    var key = d.key || ('?' + d.id);
                    covered[d.target + ':' + key] = true;
                    if (d.kind === 'homelist') for (var hi = 0; hi < 7; hi++) covered['prefs:homesection' + hi] = true;
                    (d.alsoKeys || []).forEach(function (k) { covered[d.target + ':' + k] = true; });
                    var vt = d.target === 'prefs' ? 'string' : (d.vtype || 'string');
                    var value = d.def, checked = o.checked, missing = unresolved;
                    if (d.kind === 'homelist') {
                        var hp = o.source ? o.source.prefs : (anyHome(adminData.prefs) ? adminData.prefs : modeHome());
                        value = homeValue(hp);
                        if (o.source && !anyHome(o.source.prefs)) { checked = false; value = d.def; }
                    } else if (d.sensitive) { value = d.def; checked = false; }
                    else if (d.target === 'policy' && !o.source) { value = d.def; }
                    else if (!unresolved) {
                        if (o.source) {
                            var src = o.source[d.target] || {};
                            if (has(src, d.key)) value = src[d.key]; else checked = false;
                        } else {
                            var a = adminData[d.target];
                            if (has(a, d.key)) value = a[d.key];
                            else { var mc = mostCommon(d.target, d.key); if (mc !== undefined) value = mc; }
                        }
                        if (d.target === 'config' && discovered && !obs.config[d.key] && !o.source) missing = true;
                    }
                    if ((d.kind === 'views' || d.kind === 'libexcl') && !views.length) missing = true;
                    if ((d.defaultUnchecked && !o.source) || d.optIn) checked = false;
                    if (d.dyn && (value === '' || value === undefined)) checked = false;
                    if (missing) checked = false;
                    list.push(makeEntry({ target: d.target, key: key, vtype: vt, value: value, checked: checked, label: d.label, title: d.title, n: d.n, group: d.group, options: d.options, placeholder: d.placeholder, missing: missing, kind: d.kind, alias: !!d.alias, sensitive: d.sensitive, optIn: d.optIn, pattern: d.pattern, alsoKeys: d.alsoKeys, i18nPlaceholder: d.i18nPlaceholder }));
                });
                if (!o.noExtras) {
                    ['config', 'prefs'].forEach(function (target) {
                        var keys = o.source ? Object.keys(o.source[target]) : Object.keys(obs[target]);
                        keys.sort().forEach(function (key) {
                            if (EXCLUDE.test(key) || NOISE.test(key) || covered[target + ':' + key]) return;
                            var value = o.source ? o.source[target][key] : (has(adminData[target], key) ? adminData[target][key] : mostCommon(target, key));
                            list.push(makeEntry({ target: target, key: key, value: value, checked: !!o.source }));
                        });
                    });
                }
                return list;
            }
            function valueToControl(e) { if (e.value === null || e.value === undefined) return ''; if (typeof e.value === 'object') return JSON.stringify(e.value); return String(e.value); }
            function readEntry(e) {
                if (e.read) return e.read();
                var raw = e.ctl.value;
                if (e.pattern && !e.pattern.test(raw)) throw new Error(t('badPin'));
                if (e.vtype === 'boolean') return raw === 'true';
                if (e.vtype === 'number') { if (raw === '' && e.nullable) return null; var n = Number(raw); if (raw === '' || isNaN(n)) throw new Error(t('badValue', [e.key])); return n; }
                if (e.vtype === 'json') { try { return JSON.parse(raw); } catch (x) { throw new Error(t('badValue', [e.key])); } }
                if (e.nullable && raw === '') return null;
                return raw;
            }
            function entryName(e) { if (e.title) return e.title; return e.label ? t(e.label, e.n ? [e.n] : null) : e.key; }

            function makeViewsControl(e) {
                var names = {}, all = [];
                views.forEach(function (v) { names[v.Id] = v.Name; all.push(v.Id); });
                var wanted = Array.isArray(e.value) ? e.value : [];
                var order = wanted.filter(function (id) { return names[id] !== undefined; });
                all.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
                var hidden = wanted.filter(function (id) { return names[id] === undefined; });
                var box = el('div', 'eus-views');
                function draw() {
                    box.textContent = '';
                    order.forEach(function (id, i) {
                        var r = el('div'); r.appendChild(el('span', '', names[id]));
                        var up = el('button', '', '▲'); up.type = 'button'; up.title = t('moveUp'); up.disabled = i === 0;
                        var dn = el('button', '', '▼'); dn.type = 'button'; dn.title = t('moveDown'); dn.disabled = i === order.length - 1;
                        up.addEventListener('click', function () { order.splice(i - 1, 0, order.splice(i, 1)[0]); draw(); });
                        dn.addEventListener('click', function () { order.splice(i + 1, 0, order.splice(i, 1)[0]); draw(); });
                        r.appendChild(up); r.appendChild(dn); box.appendChild(r);
                    });
                }
                draw();
                e.read = function () { return order.concat(hidden); };
                return box;
            }
            var UNRATED = {
                Movie: { en: 'Movies', nl: 'Films', de: 'Filme', fr: 'Films', es: 'Películas' },
                Trailer: { en: 'Trailers', nl: 'Trailers', de: 'Trailer', fr: 'Bandes-annonces', es: 'Tráileres' },
                Series: { en: 'TV shows', nl: 'Series', de: 'Serien', fr: 'Séries', es: 'Series' },
                Music: { en: 'Music', nl: 'Muziek', de: 'Musik', fr: 'Musique', es: 'Música' },
                Book: { en: 'Books', nl: 'Boeken', de: 'Bücher', fr: 'Livres', es: 'Libros' },
                Game: { en: 'Games', nl: 'Games', de: 'Spiele', fr: 'Jeux', es: 'Juegos' },
                LiveTvChannel: { en: 'Live TV channels', nl: 'Live tv-kanalen', de: 'Live-TV-Kanäle', fr: 'Chaînes TV en direct', es: 'Canales de TV en vivo' },
                LiveTvProgram: { en: 'Live TV programs', nl: 'Live tv-programma\'s', de: 'Live-TV-Sendungen', fr: 'Programmes TV en direct', es: 'Programas de TV en vivo' },
                ChannelContent: { en: 'Channel content', nl: 'Kanaalinhoud', de: 'Kanalinhalte', fr: 'Contenu des chaînes', es: 'Contenido de canales' }
            };
            var UNRATED_ORDER = ['Movie', 'Trailer', 'Series', 'Music', 'Book', 'Game', 'LiveTvChannel', 'LiveTvProgram', 'ChannelContent'];
            function makeUnratedControl(e) {
                var chosen = {}; (Array.isArray(e.value) ? e.value : []).forEach(function (v) { chosen[v] = true; });
                var box = el('div', 'eus-views eus-libs');
                function addRow(k, text) {
                    var r = el('label', 'eus-lib'); var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!chosen[k];
                    cb.addEventListener('change', function () { chosen[k] = cb.checked; });
                    r.appendChild(cb); r.appendChild(el('span', '', text)); box.appendChild(r);
                }
                UNRATED_ORDER.forEach(function (k) { addRow(k, UNRATED[k][language] || UNRATED[k].en); });
                Object.keys(chosen).forEach(function (k) { if (!UNRATED[k]) addRow(k, k); });
                e.read = function () { return Object.keys(chosen).filter(function (k) { return chosen[k]; }); };
                return box;
            }
            function makeTagListControl(e) {
                var input = document.createElement('input'); input.type = 'text'; input.className = 'eus-select eus-text'; input.placeholder = e.placeholder || '';
                input.value = Array.isArray(e.value) ? e.value.join(', ') : '';
                e.read = function () { return input.value.split(',').map(function (x) { return x.trim(); }).filter(function (x) { return x; }); };
                return input;
            }
            function makeLibExclControl(e) {
                var names = {}, all = [];
                views.forEach(function (v) { names[v.Id] = v.Name; all.push(v.Id); });
                var chosen = {}, wanted = Array.isArray(e.value) ? e.value : [];
                wanted.forEach(function (id) { chosen[id] = true; });
                var hidden = wanted.filter(function (id) { return names[id] === undefined; });
                var box = el('div', 'eus-views eus-libs');
                all.forEach(function (id) {
                    var r = el('label', 'eus-lib');
                    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!chosen[id];
                    cb.addEventListener('change', function () { chosen[id] = cb.checked; });
                    r.appendChild(cb); r.appendChild(el('span', '', names[id])); box.appendChild(r);
                });
                e.read = function () { return all.filter(function (id) { return chosen[id]; }).concat(hidden); };
                return box;
            }
            function makeHomeListControl(e) {
                var opts = HOME_OPTS.filter(function (o) { return o[0] !== 'none'; });
                var list = (Array.isArray(e.value) ? e.value : []).slice(0, 7);
                var box = el('div', 'eus-views');
                var addBtn = el('button', '', '＋ ' + t('addSection')); addBtn.type = 'button';
                function draw() {
                    box.textContent = '';
                    list.forEach(function (val, i) {
                        var r = el('div');
                        var sel = document.createElement('select');
                        var present = false;
                        opts.forEach(function (o) { var op = document.createElement('option'); op.value = o[0]; op.textContent = label(o[1]); sel.appendChild(op); if (o[0] === val) present = true; });
                        if (!present) { var x = document.createElement('option'); x.value = val; x.textContent = val; sel.appendChild(x); }
                        sel.value = val;
                        sel.addEventListener('change', function () { list[i] = sel.value; });
                        var up = el('button', '', '▲'); up.type = 'button'; up.title = t('moveUp'); up.disabled = i === 0;
                        var dn = el('button', '', '▼'); dn.type = 'button'; dn.title = t('moveDown'); dn.disabled = i === list.length - 1;
                        var rm = el('button', '', '✕'); rm.type = 'button'; rm.title = t('removeSection');
                        up.addEventListener('click', function () { list.splice(i - 1, 0, list.splice(i, 1)[0]); draw(); });
                        dn.addEventListener('click', function () { list.splice(i + 1, 0, list.splice(i, 1)[0]); draw(); });
                        rm.addEventListener('click', function () { list.splice(i, 1); draw(); });
                        r.appendChild(sel); r.appendChild(up); r.appendChild(dn); r.appendChild(rm); box.appendChild(r);
                    });
                    addBtn.disabled = list.length >= 7;
                    box.appendChild(addBtn);
                }
                addBtn.addEventListener('click', function () {
                    var used = {}; list.forEach(function (v) { used[v] = true; });
                    var next = opts.filter(function (o) { return !used[o[0]]; })[0] || opts[0];
                    list.push(next[0]); draw();
                });
                draw();
                e.read = function () { return list.slice(); };
                return box;
            }
            // A form entry can stand for several stored keys (home sections -> homesection0..6).
            function expandEntry(e, value) {
                if (e.kind === 'homelist') {
                    var out = [];
                    for (var i = 0; i < 7; i++) out.push({ key: 'homesection' + i, value: value[i] || 'none' });
                    return out;
                }
                var res = [{ key: e.key, value: value }];
                (e.alsoKeys || []).forEach(function (k) { res.push({ key: k, value: value }); });
                return res;
            }
            function makeRow(e) {
                var row = el('div', 'eus-setting' + (e.missing ? ' eus-missing' : ''));
                var chk = document.createElement('input'); chk.type = 'checkbox'; chk.setAttribute('is', 'emby-checkbox'); chk.checked = !!e.checked; chk.id = 'eus-chk-' + e.uid;
                chk.disabled = e.missing;
                chk.addEventListener('change', function () { e.checked = chk.checked; });
                var lab = el('label', '', entryName(e)); lab.setAttribute('for', chk.id);
                if (!e.label && !e.title) lab.appendChild(el('span', 'eus-tag', e.target === 'config' ? 'config' : 'prefs'));
                else if (e.alias && !e.missing && e.kind !== 'homelist' && e.kind !== 'libexcl') lab.appendChild(el('span', 'eus-tag', '↳ ' + e.key));
                if (e.missing) lab.appendChild(el('span', 'eus-tag eus-warn', '(' + t('notFound') + ')'));
                row.appendChild(chk); row.appendChild(lab);
                var control, current = valueToControl(e);
                if (e.kind === 'views') { control = makeViewsControl(e); }
                else if (e.kind === 'homelist') { control = makeHomeListControl(e); }
                else if (e.kind === 'libexcl') { control = makeLibExclControl(e); }
                else if (e.kind === 'unrated') { control = makeUnratedControl(e); }
                else if (e.kind === 'taglist') { control = makeTagListControl(e); }
                else {
                    var seen = e.sensitive ? [] : observedStrings(e.target, e.key);
                    var opts = e.options;
                    if (!opts && (e.vtype === 'boolean' || (e.target === 'prefs' && (current === 'true' || current === 'false' || (!current && seen.length && seen.every(function (s) { return s === 'true' || s === 'false'; })))))) opts = BOOL;
                    if (opts) {
                        control = document.createElement('select'); control.className = 'eus-select'; control.setAttribute('is', 'emby-select');
                        var present = {};
                        opts.forEach(function (o) { var opt = document.createElement('option'); opt.value = o[0]; opt.textContent = label(o[1]); control.appendChild(opt); present[o[0]] = true; });
                        seen.concat([current]).forEach(function (v) { if (!present[v] && v !== '') { var x = document.createElement('option'); x.value = v; x.textContent = label(v); control.appendChild(x); present[v] = true; } });
                        if (!present[current]) { var blank = document.createElement('option'); blank.value = current; blank.textContent = '—'; control.appendChild(blank); }
                        control.value = current;
                    } else {
                        control = document.createElement('input'); control.type = 'text'; control.className = 'eus-select eus-text';
                        control.placeholder = e.i18nPlaceholder ? label(e.placeholder) : (e.placeholder || ''); control.value = current;
                        if (seen.length) {
                            var dl = document.createElement('datalist'); dl.id = 'eus-dl-' + e.uid;
                            seen.forEach(function (v) { var o = document.createElement('option'); o.value = v; dl.appendChild(o); });
                            control.setAttribute('list', dl.id); row.appendChild(dl);
                        }
                    }
                    if (e.missing) control.disabled = true;
                }
                e.chk = chk; e.ctl = control; e.row = row;
                row.appendChild(control);
                return row;
            }
            function renderEditor() {
                var host = byId('eus-settings'); host.textContent = '';
                GROUPS.forEach(function (group) {
                    var panel = el('div', 'eus-panel'); panel.appendChild(el('h2', '', t(group)));
                    entries.filter(function (e) { return e.group === group; }).forEach(function (e) { panel.appendChild(makeRow(e)); });
                    host.appendChild(panel);
                });
                var extraHost = byId('eus-extra'); extraHost.textContent = '';
                var extras = entries.filter(function (e) { return !e.group; });
                byId('eus-more').style.display = extras.length ? '' : 'none';
                byId('eus-filter-row').style.display = extras.length > 12 ? '' : 'none';
                extras.forEach(function (e) { var r = makeRow(e); r.setAttribute('data-key', e.key.toLowerCase()); extraHost.appendChild(r); });
                applyFilter();
            }
            function applyFilter() {
                var q = byId('eus-filter').value.trim().toLowerCase();
                Array.prototype.forEach.call(byId('eus-extra').querySelectorAll('[data-key]'), function (r) { r.style.display = (!q || r.getAttribute('data-key').indexOf(q) >= 0) ? '' : 'none'; });
            }
            function setChecked(state, onlyExtras) {
                entries.forEach(function (e) { if (e.missing || e.sensitive || e.optIn || (onlyExtras && e.group)) return; e.checked = state; if (e.chk) e.chk.checked = state; });
            }
            function syncModel() {
                entries.forEach(function (e) { if (!e.ctl) return; try { e.value = readEntry(e); } catch (x) { e.value = e.ctl.value; e.vtype = 'string'; } });
            }
            function missingCount() { return entries.filter(function (e) { return e.group && e.missing; }).length; }

            // ---------------------------------------------------------------
            // Copy settings from a user (optional)
            // ---------------------------------------------------------------
            function loadFromUser() {
                var id = byId('eus-source-user').value; if (!id) return;
                var user = users.filter(function (u) { return u.Id === id; })[0], uid = encodeURIComponent(id);
                note(t('loading'));
                Promise.all([apiGet('Users/' + uid), apiGet('DisplayPreferences/usersettings?userId=' + uid + '&client=emby')]).then(function (res) {
                    var source = { config: (res[0] && res[0].Configuration) || {}, prefs: (res[1] && res[1].CustomPrefs) || {}, policy: (res[0] && res[0].Policy) || {} };
                    entries = buildEntries({ checked: true, source: source });
                    byId('eus-preset').value = '';
                    renderEditor();
                    note(t('loaded', [user ? user.Name : id, entries.filter(function (e) { return e.group && !e.missing && !e.checked; }).length]));
                }).catch(function (error) { note((error && error.message) || t('apiFailed')); });
            }
            function showDiagnostics() {
                var out = { config: {}, prefs: {}, policy: {}, resolvedAliases: {} };
                ['config', 'prefs', 'policy'].forEach(function (tg) { Object.keys(obs[tg]).sort().forEach(function (k) { out[tg][k] = EXCLUDE.test(k) ? ['(hidden)'] : observedStrings(tg, k).slice(0, 5); }); });
                DEFS.forEach(function (d) { if (d.alias) out.resolvedAliases[d.id] = d.key || null; });
                var box = byId('eus-diag-out'); box.style.display = ''; box.value = JSON.stringify(out, null, 1);
                try { box.select(); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(box.value); } catch (x) { }
                note(t('diagDone'));
            }

            // ---------------------------------------------------------------
            // Presets (stored in the plugin configuration on the server)
            // ---------------------------------------------------------------
            function presetsUrl() { return 'Plugins/' + PLUGIN_ID + '/Configuration'; }
            function readPresets() {
                return apiGet(presetsUrl()).then(function (cfg) {
                    try { presets = JSON.parse((cfg && cfg.PresetsJson) || '[]'); } catch (x) { presets = []; }
                    if (!Array.isArray(presets)) presets = [];
                });
            }
            function writePresets() {
                return apiGet(presetsUrl()).then(function (cfg) { cfg = cfg || {}; cfg.PresetsJson = JSON.stringify(presets); return apiPost(presetsUrl(), cfg); });
            }
            function renderPresetSelect(selectedId) {
                var sel = byId('eus-preset'); sel.textContent = '';
                var none = document.createElement('option'); none.value = ''; none.textContent = t('noPreset'); sel.appendChild(none);
                presets.forEach(function (p) { var o = document.createElement('option'); o.value = p.id; o.textContent = p.name; sel.appendChild(o); });
                sel.value = selectedId || '';
            }
            function currentPreset() { var id = byId('eus-preset').value; return presets.filter(function (p) { return p.id === id; })[0] || null; }
            function loadPresetIntoEditor(p) {
                var list = buildEntries({ checked: false, noExtras: true });
                ['config', 'prefs', 'policy'].forEach(function (target) {
                    var bag = p[target] || {};
                    Object.keys(bag).forEach(function (key) {
                        if (target === 'prefs' && /^homesection[0-6]$/.test(key)) {
                            var he = list.filter(function (x) { return x.kind === 'homelist'; })[0];
                            if (he) { he.value = homeValue(bag); he.checked = true; he.missing = false; return; }
                        }
                        if (list.some(function (x) { return x.target === target && x.alsoKeys && x.alsoKeys.indexOf(key) >= 0; })) return;
                        var e = list.filter(function (x) { return x.target === target && x.key === key; })[0];
                        if (e) { e.value = bag[key]; e.checked = true; e.missing = false; e.nullable = bag[key] === null; }
                        else list.push(makeEntry({ target: target, key: key, value: bag[key], checked: true }));
                    });
                });
                entries = list; renderEditor();
                byId('eus-preset-name').value = p.name;
                note(t('presetLoaded', [p.name]));
            }
            function savePreset() {
                var name = byId('eus-preset-name').value.trim();
                if (!name) { note(t('presetNameNeeded')); return; }
                var preset = { id: '', name: name, config: {}, prefs: {}, policy: {} }, n = 0;
                try { entries.forEach(function (e) { if (!e.checked || e.missing || e.sensitive) return; expandEntry(e, readEntry(e)).forEach(function (x) { preset[e.target][x.key] = x.value; n++; }); }); }
                catch (err) { note(err.message); return; }
                if (!n) { note(t('presetEmpty')); return; }
                var existing = presets.filter(function (p) { return p.name.toLowerCase() === name.toLowerCase(); })[0];
                if (existing) { if (!window.confirm(t('presetOverwrite', [existing.name]))) return; preset.id = existing.id; presets[presets.indexOf(existing)] = preset; }
                else { preset.id = 'p' + new Date().getTime(); presets.push(preset); }
                writePresets().then(function () { renderPresetSelect(preset.id); note(t('presetSaved', [name, n])); })
                    .catch(function (error) { note(t('presetsFailed', [(error && error.message) || t('apiFailed')])); });
            }
            function deletePreset() {
                var p = currentPreset();
                if (!p) { note(t('selectPresetFirst')); return; }
                if (!window.confirm(t('presetDelete', [p.name]))) return;
                presets = presets.filter(function (x) { return x.id !== p.id; });
                writePresets().then(function () { renderPresetSelect(''); byId('eus-preset-name').value = ''; note(t('presetDeleted')); })
                    .catch(function (error) { note(t('presetsFailed', [(error && error.message) || t('apiFailed')])); });
            }

            // ---------------------------------------------------------------
            // Users
            // ---------------------------------------------------------------
            function updateCount() { byId('eus-count').textContent = t('selectedCount', [page.querySelectorAll('.eus-user-check:checked').length, users.length]); }
            function renderUsers() {
                var container = byId('eus-users'); container.textContent = '';
                var src = byId('eus-source-user'); src.textContent = '';
                var ph = document.createElement('option'); ph.value = ''; ph.textContent = t('pickUser'); src.appendChild(ph);
                if (!users.length) { container.textContent = t('noUsers'); updateCount(); return; }
                users.forEach(function (user) {
                    var row = el('label', 'eus-user');
                    var cb = document.createElement('input'); cb.type = 'checkbox'; cb.className = 'eus-user-check'; cb.value = user.Id; cb.checked = false;
                    cb.addEventListener('change', updateCount);
                    row.appendChild(cb); row.appendChild(el('span', '', user.Name || user.Id)); container.appendChild(row);
                    var o = document.createElement('option'); o.value = user.Id; o.textContent = user.Name || user.Id; src.appendChild(o);
                });
                updateCount();
            }
            function setAllUsers(state) { Array.prototype.forEach.call(page.querySelectorAll('.eus-user-check'), function (b) { b.checked = state; }); updateCount(); }
            function loadUsers() {
                if (loading) return Promise.resolve();
                loading = true; setStatus(t('loading'), false);
                return apiGet('Users').then(function (data) {
                    users = Array.isArray(data) ? data : ((data && data.Items) || []);
                    users.sort(function (a, b) { return String(a.Name || '').localeCompare(String(b.Name || '')); });
                    renderUsers(); setStatus(t('usersLoaded', [users.length]), false);
                    return discover().then(function () {
                        entries = buildEntries({ checked: true }); renderEditor();
                        setStatus('', false);
                    });
                }).catch(function (error) {
                    setStatus(t('loadFailed'), true);
                    byId('eus-users').textContent = (error && error.message) || t('apiFailed');
                }).then(function () { loading = false; });
            }
            // Only users whose checkbox is ticked are ever targeted.
            function selectedUsers() {
                var ids = {};
                Array.prototype.forEach.call(page.querySelectorAll('.eus-user-check:checked'), function (b) { ids[b.value] = true; });
                return users.filter(function (u) { return !!ids[u.Id]; });
            }

            // ---------------------------------------------------------------
            // Apply
            // ---------------------------------------------------------------
            function applyToUser(user, changes) {
                var userId = encodeURIComponent(user.Id), userPath = 'Users/' + userId;
                var cfgChanges = changes.filter(function (c) { return c.target === 'config'; });
                var prefChanges = changes.filter(function (c) { return c.target === 'prefs'; });
                var policyChanges = changes.filter(function (c) { return c.target === 'policy'; });
                var chain = Promise.resolve();
                if (cfgChanges.length) {
                    chain = chain.then(function () { return apiGet(userPath); }).then(function (details) {
                        var config = details && details.Configuration;
                        if (!config) throw new Error(t('noConfig'));
                        cfgChanges.forEach(function (c) { config[c.key] = c.value; });
                        return apiPost(userPath + '/Configuration', config);
                    }).then(function () { return apiGet(userPath); }).then(function (verify) {
                        var vc = (verify && verify.Configuration) || {};
                        cfgChanges.forEach(function (c) { if (norm(vc[c.key]) !== norm(c.value)) throw new Error(t('verifyFailed', [c.name, norm(vc[c.key])])); });
                    });
                }
                if (prefChanges.length) {
                    chain = chain.then(function () {
                        var prefsPath = 'DisplayPreferences/usersettings?userId=' + userId + '&client=emby';
                        return apiGet(prefsPath).then(function (prefs) {
                            var custom = prefs.CustomPrefs || {};
                            prefChanges.forEach(function (c) { custom[c.key] = norm(c.value); });
                            prefs.CustomPrefs = custom;
                            return apiPost(prefsPath, prefs).then(function () { return apiGet(prefsPath); });
                        }).then(function (verify) {
                            var vc = (verify && verify.CustomPrefs) || {};
                            prefChanges.forEach(function (c) { if (norm(vc[c.key]) !== norm(c.value)) throw new Error(t('verifyFailed', [c.name, norm(vc[c.key])])); });
                        });
                    });
                }
                if (policyChanges.length) {
                    chain = chain.then(function () { return apiGet(userPath); }).then(function (details) {
                        var policy = details && details.Policy;
                        if (!policy) throw new Error(t('noConfig'));
                        policyChanges.forEach(function (c) { policy[c.key] = c.value; });
                        return apiPost(userPath + '/Policy', policy);
                    }).then(function () { return apiGet(userPath); }).then(function (verify) {
                        var vp = (verify && verify.Policy) || {};
                        policyChanges.forEach(function (c) { if (norm(vp[c.key]) !== norm(c.value)) throw new Error(t('verifyFailed', [c.name, norm(vp[c.key])])); });
                    });
                }
                return chain.then(function () { return changes.length + ' ✓'; });
            }
            function applySettings() {
                if (applying || loading) return;
                var targets = selectedUsers();
                if (!targets.length) { setStatus(t('selectOne'), true); return; }
                var changes = [];
                try { entries.forEach(function (e) { if (!e.checked || e.missing) return; expandEntry(e, readEntry(e)).forEach(function (x) { changes.push({ name: entryName(e), target: e.target, key: x.key, value: x.value }); }); }); }
                catch (err) { setStatus(err.message, true); return; }
                if (!changes.length) { setStatus(t('checkOne'), true); return; }
                var names = targets.slice(0, 8).map(function (u) { return '• ' + (u.Name || u.Id); }).join('\n');
                if (targets.length > 8) names += '\n… +' + (targets.length - 8);
                var list = changes.slice(0, 12).map(function (c) { return c.name; }).join(', ') + (changes.length > 12 ? ' … +' + (changes.length - 12) : '');
                var selfId = (ApiClient.getCurrentUserId && ApiClient.getCurrentUserId()) || null;
                var risky = changes.some(function (c) { return c.target === 'policy' && ((c.key === 'IsAdministrator' && c.value === true) || (c.key === 'IsDisabled' && c.value === true)); });
                var lockout = changes.some(function (c) { return c.target === 'policy' && ((c.key === 'IsAdministrator' && c.value === false) || (c.key === 'IsDisabled' && c.value === true)); }) && targets.some(function (u) { return u.Id === selfId; });
                if (lockout) { setStatus(t('lockout'), true); return; }
                if (risky && !window.confirm(t('adminWarn'))) return;
                if (!window.confirm(t('confirm', [changes.length, targets.length, names, list]))) return;
                applying = true; byId('eus-apply').disabled = true; byId('eus-results').textContent = ''; setStatus(t('applying'), false);
                var lines = [], succeeded = 0, failed = 0, index = 0;
                function next() {
                    if (index >= targets.length) { setStatus(t('completed', [succeeded, failed]), failed > 0); applying = false; byId('eus-apply').disabled = false; return; }
                    var user = targets[index++];
                    applyToUser(user, changes).then(function (result) { lines.push(t('ok') + '  ' + (user.Name || user.Id) + ': ' + result); succeeded++; })
                        .catch(function (error) { lines.push(t('error') + '  ' + (user.Name || user.Id) + ': ' + ((error && error.message) || String(error))); failed++; })
                        .then(function () { byId('eus-results').textContent = lines.join('\n'); next(); });
                }
                next();
            }

            localizePage();
            entries = buildEntries({ checked: true, noExtras: true });
            renderEditor();
            renderPresetSelect('');
            (function () {
                var sel0 = byId('eus-lang');
                function applyAuto() { if (sel0 && sel0.value !== 'auto') return; var l = detectLanguage(); if (l !== language) { entries.forEach(function (e) { if (e.ctl && !e.missing) { try { e.value = readEntry(e); } catch (x) { } } }); language = l; localizePage(); renderEditor(); refreshLangUI(); renderPresetSelect(byId('eus-preset') ? byId('eus-preset').value : ''); } }
                function tryUser() { return apiGet('Users/' + encodeURIComponent(ApiClient.getCurrentUserId())).then(function (u) { var c = u && u.Configuration && (u.Configuration.UICulture || u.Configuration.Culture); if (c) embyCulture = c; }).catch(function () { }); }
                apiGet('System/Configuration').then(function (c) { if (c && c.UICulture) embyCulture = c.UICulture; }).catch(function () { }).then(applyAuto);
            })();
            (function () {
                var sel = byId('eus-lang'); if (!sel) return;
                var stored = ''; try { stored = window.localStorage.getItem('eus-lang') || ''; } catch (x) { } sel.value = (LANGS.indexOf(stored) >= 0) ? stored : 'auto';
                sel.addEventListener('change', function () {
                    entries.forEach(function (e) { if (e.ctl && !e.missing) { try { e.value = readEntry(e); } catch (x) { } } });
                    language = LANGS.indexOf(sel.value) >= 0 ? sel.value : detectLanguage();
                    try { window.localStorage.setItem('eus-lang', sel.value); } catch (x) { }
                    localizePage(); renderEditor(); renderPresetSelect(byId('eus-preset') ? byId('eus-preset').value : '');
                });
            })();
            (function () {
                var NS = 'http://www.w3.org/2000/svg';
                var FLAGS = {
                    en: '<rect width="24" height="16" fill="#012169"/><path d="M0 0L24 16M24 0L0 16" stroke="#fff" stroke-width="3.2"/><path d="M0 0L24 16M24 0L0 16" stroke="#C8102E" stroke-width="1.4"/><path d="M12 0V16M0 8H24" stroke="#fff" stroke-width="5.4"/><path d="M12 0V16M0 8H24" stroke="#C8102E" stroke-width="3.2"/>',
                    nl: '<rect width="24" height="5.34" fill="#AE1C28"/><rect y="5.33" width="24" height="5.34" fill="#fff"/><rect y="10.66" width="24" height="5.34" fill="#21468B"/>',
                    de: '<rect width="24" height="5.34" fill="#000"/><rect y="5.33" width="24" height="5.34" fill="#DD0000"/><rect y="10.66" width="24" height="5.34" fill="#FFCE00"/>',
                    fr: '<rect width="8" height="16" fill="#0055A4"/><rect x="8" width="8" height="16" fill="#fff"/><rect x="16" width="8" height="16" fill="#EF4135"/>',
                    es: '<rect width="24" height="16" fill="#AA151B"/><rect y="4" width="24" height="8" fill="#F1BF00"/>'
                };
                var NAMES = { auto: 'Auto (Emby)', en: 'English', nl: 'Nederlands', de: 'Deutsch', fr: 'Français', es: 'Español' };
                function svg(inner, cls, vb) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', vb); s.setAttribute('class', cls); s.innerHTML = inner; return s; }
                function icon(code) {
                    if (code === 'auto') return svg('<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M3 12h18M4.5 7.5h15M4.5 16.5h15" stroke="currentColor" stroke-width="1.6" fill="none"/>', 'eus-globe', '0 0 24 24');
                    return svg(FLAGS[code], 'eus-flag', '0 0 24 16');
                }
                var box = byId('eus-langbox'), sel = byId('eus-lang'); if (!box || !sel) return;
                var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'eus-lang-btn'; btn.setAttribute('aria-haspopup', 'listbox');
                var menu = document.createElement('div'); menu.className = 'eus-lang-menu'; menu.setAttribute('role', 'listbox');
                box.appendChild(btn); box.appendChild(menu);
                function close() { menu.classList.remove('eus-open'); }
                refreshLangUI = function () {
                    btn.textContent = '';
                    var g = icon('auto'); btn.appendChild(g);
                    if (sel.value !== 'auto') btn.appendChild(icon(sel.value)); else if (FLAGS[language]) btn.appendChild(icon(language));
                    var sp = document.createElement('span'); sp.textContent = NAMES[sel.value] || sel.value; btn.appendChild(sp);
                    var caret = document.createElement('span'); caret.textContent = '▾'; caret.style.opacity = '.7'; btn.appendChild(caret);
                    Array.prototype.forEach.call(menu.children, function (c) { c.classList.toggle('eus-sel', c.getAttribute('data-v') === sel.value); });
                };
                ['auto', 'en', 'nl', 'de', 'fr', 'es'].forEach(function (code) {
                    var it = document.createElement('button'); it.type = 'button'; it.className = 'eus-lang-item'; it.setAttribute('data-v', code); it.setAttribute('role', 'option');
                    it.appendChild(icon(code)); var sp = document.createElement('span'); sp.textContent = NAMES[code]; it.appendChild(sp);
                    it.addEventListener('click', function () { sel.value = code; sel.dispatchEvent(new Event('change')); close(); refreshLangUI(); });
                    menu.appendChild(it);
                });
                btn.addEventListener('click', function (ev) { ev.stopPropagation(); menu.classList.toggle('eus-open'); });
                document.addEventListener('click', close);
                refreshLangUI();
            })();
            byId('eus-reload').addEventListener('click', loadUsers);
            byId('eus-select-all').addEventListener('click', function () { setAllUsers(true); });
            byId('eus-select-none').addEventListener('click', function () { setAllUsers(false); });
            byId('eus-apply').addEventListener('click', applySettings);
            byId('eus-load-user').addEventListener('click', loadFromUser);
            byId('eus-diag').addEventListener('click', showDiagnostics);
            byId('eus-preset').addEventListener('change', function () { var p = currentPreset(); if (p) loadPresetIntoEditor(p); });
            byId('eus-preset-save').addEventListener('click', function () { syncModel(); savePreset(); });
            byId('eus-preset-delete').addEventListener('click', deletePreset);
            byId('eus-filter').addEventListener('input', applyFilter);
            // Administrators only: fail closed if the signed-in user cannot be confirmed as an admin.
            function ensureAdmin() {
                var id = ApiClient.getCurrentUserId && ApiClient.getCurrentUserId();
                if (!id) return Promise.resolve(false);
                return apiGet('Users/' + encodeURIComponent(id)).then(function (u) { return !!(u && u.Policy && u.Policy.IsAdministrator); }).catch(function () { return false; });
            }
            ensureAdmin().then(function (isAdmin) {
                if (!isAdmin) {
                    var wrap = page.querySelector('.eus-wrap'); wrap.textContent = '';
                    wrap.appendChild(el('h1', '', t('title'))); wrap.appendChild(el('p', 'eus-error', t('adminOnly')));
                    throw new Error('not-admin');
                }
                return loadUsers();
            }).then(function () { return readPresets(); }).then(function () { renderPresetSelect(''); }).catch(function (error) {
                if (error && error.message === 'not-admin') return;
                note(t('presetsFailed', [(error && error.message) || t('apiFailed')]));
            });
        })();
    };
});
