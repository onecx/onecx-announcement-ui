const { ModifyEntryPlugin } = require('@angular-architects/module-federation/src/utils/modify-entry-plugin')
const { share, withModuleFederationPlugin } = require('@angular-architects/module-federation/webpack')

const config = withModuleFederationPlugin({
  name: 'onecx-announcement-ui',
  filename: 'remoteEntry.js',
  exposes: {
    './OneCXAnnouncementModule': 'src/bootstrap.ts',
    './OneCXAnnouncementBannerComponent':
      'src/app/remotes/announcement-banner/announcement-banner.component.bootstrap.ts'
  },
  shared: share({
    '@angular/core': { requiredVersion: 'auto', includeSecondaries: true },
    '@angular/forms': {
      requiredVersion: 'auto',
      includeSecondaries: true
    },
    '@angular/common': {
      requiredVersion: 'auto',
      includeSecondaries: {
        skip: ['@angular/common/http/testing']
      }
    },
    '@angular/common/http': {
      requiredVersion: 'auto',
      includeSecondaries: true
    },
    '@angular/router': { requiredVersion: 'auto', includeSecondaries: true },
    '@angular/elements': {
      requiredVersion: 'auto',
      includeSecondaries: true
    },
    rxjs: { requiredVersion: 'auto', includeSecondaries: true }
  }),
  sharedMappings: []
})
config.devServer = {
  allowedHosts: 'all'
}

const plugins = config.plugins.filter((plugin) => !(plugin instanceof ModifyEntryPlugin))

module.exports = {
  ...config,
  plugins,
  output: {
    uniqueName: 'onecx-announcement-ui',
    publicPath: 'auto'
  },
  experiments: {
    ...config.experiments,
    topLevelAwait: true
  },
  optimization: {
    runtimeChunk: false,
    splitChunks: false
  }
}
