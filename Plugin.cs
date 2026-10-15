using System;
using System.Collections.Generic;
using System.IO;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Drawing;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace EmbyUserSettingsManager
{
    public sealed class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages, IHasThumbImage
    {
        private static readonly Guid PluginGuid = new Guid("a67b5b10-19df-48b1-b2db-4f63a7e3d54a");

        public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
            : base(applicationPaths, xmlSerializer)
        {
            Instance = this;
        }

        public static Plugin Instance { get; private set; }
        public override string Name => "Emby User Settings Manager";
        public override Guid Id => PluginGuid;
        public override string Description => "Apply selected playback and display preferences to one or more Emby users.";

        // Plugin logo shown in the Emby plugin catalog / installed plugins list.
        public ImageFormat ThumbImageFormat => ImageFormat.Png;

        public Stream GetThumbImage()
        {
            return GetType().Assembly.GetManifestResourceStream(GetType().Namespace + ".Configuration.logo.png");
        }

        public IEnumerable<PluginPageInfo> GetPages()
        {
            yield return new PluginPageInfo
            {
                Name = "EmbyUserSettingsManager",
                DisplayName = "Emby User Settings",
                EmbeddedResourcePath = GetType().Namespace + ".Configuration.EmbyUserSettings.html",
                IsMainConfigPage = true,
                EnableInMainMenu = true,
                MenuSection = "advanced",
                MenuIcon = "tune"
            };

            yield return new PluginPageInfo
            {
                Name = "EmbyUserSettingsManager.js",
                EmbeddedResourcePath = GetType().Namespace + ".Configuration.EmbyUserSettingsManager.js"
            };
        }
    }
}
