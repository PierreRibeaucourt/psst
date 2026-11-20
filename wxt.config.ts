import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  // Les tests de bout en bout construisent une version pointant sur le serveur local, à part.
  outDir: process.env.WXT_OUT_DIR ?? '.output',
  modules: ['@wxt-dev/i18n/module'],
  zip: { artifactTemplate: 'psst-for-amazon-{{version}}-{{browser}}.zip' },
  manifest: {
    name: '__MSG_extName__',
    short_name: '__MSG_extShortName__',
    description: '__MSG_extDescription__',
    default_locale: 'en',
    homepage_url: 'https://pierreribeaucourt.github.io/psst/',
    permissions: ['storage', 'alarms'],
    action: { default_title: '__MSG_extShortName__' },
  },
});
