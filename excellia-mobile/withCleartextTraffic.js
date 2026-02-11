const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Ensure the application tag exists
    if (!androidManifest.manifest.application) {
      androidManifest.manifest.application = [{}];
    }
    
    // Forcefully add the attribute
    const application = androidManifest.manifest.application[0];
    application.$['android:usesCleartextTraffic'] = 'true';
    
    return config;
  });
};