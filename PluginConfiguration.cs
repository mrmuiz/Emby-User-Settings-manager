using MediaBrowser.Model.Plugins;

namespace EmbyUserSettingsManager
{
    public sealed class PluginConfiguration : BasePluginConfiguration
    {
        // Saved presets, stored as a JSON array by the dashboard page:
        // [{ "id": "...", "name": "...", "config": { ... }, "prefs": { ... } }]
        public string PresetsJson { get; set; } = "[]";
    }
}
