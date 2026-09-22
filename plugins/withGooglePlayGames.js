const {
  withStringsXml,
  withAndroidManifest,
  withAppBuildGradle,
  AndroidConfig,
} = require('expo/config-plugins');

/**
 * Config plugin to wire up Google Play Games Services on Android.
 *
 * Adds the `app_id` string resource and the required
 * `com.google.android.gms.games.APP_ID` <meta-data> element to the
 * <application> node. These native files live in the gitignored /android
 * folder, so this plugin re-applies them on every `expo prebuild`.
 *
 * @param {import('@expo/config-types').ExpoConfig} config
 * @param {{ appId: string }} props
 */
const withGooglePlayGames = (config, { appId } = {}) => {
  if (!appId) {
    throw new Error(
      'withGooglePlayGames: "appId" is required (Google Play Games app ID).'
    );
  }

  // 1. Add the app_id / package_name string resources (res/values/strings.xml),
  // matching the games-ids.xml Play Console generates.
  config = withStringsXml(config, (cfg) => {
    cfg.modResults = AndroidConfig.Strings.setStringItem(
      [
        {
          $: { name: 'app_id', translatable: 'false' },
          _: appId,
        },
        {
          $: { name: 'package_name', translatable: 'false' },
          _: config.android?.package ?? '',
        },
      ],
      cfg.modResults
    );
    return cfg;
  });

  // 2. Add the Play Games APP_ID <meta-data> to <application>.
  config = withAndroidManifest(config, (cfg) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      cfg.modResults
    );

    application['meta-data'] = application['meta-data'] || [];

    const name = 'com.google.android.gms.games.APP_ID';
    const existing = application['meta-data'].find(
      (item) => item.$['android:name'] === name
    );
    if (existing) {
      existing.$['android:value'] = '@string/app_id';
    } else {
      application['meta-data'].push({
        $: { 'android:name': name, 'android:value': '@string/app_id' },
      });
    }

    return cfg;
  });

  // 3. Add the Play Games Services SDK dependency to app/build.gradle.
  config = withAppBuildGradle(config, (cfg) => {
    const dep = 'implementation "com.google.android.gms:play-services-games-v2:+"';
    if (!cfg.modResults.contents.includes('play-services-games')) {
      cfg.modResults.contents = cfg.modResults.contents.replace(
        /dependencies\s*{/,
        `dependencies {\n    ${dep}`
      );
    }
    return cfg;
  });

  return config;
};

module.exports = withGooglePlayGames;
