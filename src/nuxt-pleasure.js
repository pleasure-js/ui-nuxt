import path from 'path'
import merge from 'deepmerge'
import castArray from 'lodash/castArray'
import kebabCase from 'lodash/kebabCase'
import { getConfig, findRoot, tools } from 'pleasure'
import forOwn from 'lodash/forOwn'
import get from 'lodash/get'
import Dot from 'dot-object'
import mapKeys from 'lodash/mapKeys'
import fs from 'fs'

const dot = new Dot('-')

const { packageJson } = tools
const plsConfig = getConfig()

const PleasureEnv = {
  $pleasure: true,
  '$pleasure.settings': {
    ui: 'element-ui'
  }
}
forOwn(plsConfig, (value, name) => {
  PleasureEnv[`$pleasure.${ name }`] = value
})

const resolve = (...paths) => {
  return path.join(__dirname, '../', ...paths)
}

const nodeModule = (name) => {
  return require.resolve(name)
}

const UiLibraryLocation = {
  1: {
    setup: path.join(__dirname, `../lib/setup-element-ui.js`),
    css: [
      nodeModule(`element-ui/lib/theme-chalk/display.css`),
      nodeModule(`element-ui/packages/theme-chalk/lib/index.css`)
    ]
  },
  2: {
    setup: path.join(__dirname, `../lib/setup-vuetify.js`),
    css: []
  }
}

/**
 * @enum {UiLibrary}
 */
const UiLibrary = {
  ELEMENT_UI: 1,
  VUETIFY: 2
}

/**
 * @typedef NuxtPleasureConfig
 * This object will also be loaded from the local configuration using the scope `nuxtPleasure`.
 *
 * ```js
 * // pleasure.config.js
 * module.exports = {
 *   nuxtPleasure: {
 *     // ...{NuxtPleasureConfig}
 *   }
 * }
 * ```
 *
 * @property {UiLibrary} [uiLibrary={UiLibrary.ELEMENT_UI}] - The UI Library to use. See {@link UiLibrary}.
 * @property {Boolean} [setupUiLibrary=true] - Whether to setup the library or not.
 * @property {Object} [postCssVariables] - Optional object variables for `postcss-css-variables`.
 * @property {String[]} [watchForRestart] - Array of files or directories to watch and auto restart the application on change.
 * @property {Boolean} [i18n=true] - Whether to activate i18n for Vue or not.
 * @property {String} [localesPath=<srcDir>/locales] - Directory where to load the `.js` or `.json` files containing the
 * dictionary, relative to `<srcDir>`.
 *
 * @example Providing a set of locales
 *```
 * project
 * └───<srcDir>
 *     └───locales
 *         |   [ISO-639-1].(js|json)
 *         |   [ISO-639-1].(js|json)
 * ```
 *
 * ```js
 * // pleasure.config.js
 * module.exports = {
 *   nuxtPleasure: {
 *     i18n: true,
 *     localesPath: 'locales/'
 *   }
 * }
 * ```
 */
export const config = {
  uiLibrary: UiLibrary.ELEMENT_UI,
  setupUiLibrary: true,
  localesPath: 'locales',
  i18n: true
}

/**
 * Module nuxt-pleasure.
 * @param {NuxtPleasureConfig} options
 */
export default function Pleasure (options) {
  const { nuxtPleasure = {} } = getConfig(null, true)

  options = merge.all([{}, config, nuxtPleasure, options])
  Object.assign(this.options.env, PleasureEnv)

  // console.log({ options })
  // console.log(`nuxt>>>`, this.options)
  this.options.modulesDir.push(...require.main.paths.filter(p => {
    return currentModulesDir.indexOf(p) < 0
  }))

  if (options.setupUiLibrary) {
    this.addPlugin(UiLibraryLocation[options.uiLibrary].setup)
    this.options.css.push(...castArray(UiLibraryLocation[options.uiLibrary].css))
  }

  this.addPlugin(resolve(`lib/nuxt-element-ui-pleasure-plugin.js`))
  this.addPlugin(resolve(`lib/nuxt-pleasure-plugin.js`))

  if (options.i18n) {
    this.addPlugin(resolve(`lib/nuxt-i18n-plugin.js`))
    const localesPath = path.resolve(this.options.srcDir, options.localesPath)
    const locales = {}
    if (fs.existsSync(localesPath)) {
      fs.readdirSync(localesPath).forEach(file => {
        if (!file || /\^.+$/.test(file)) {
          return
        }

        const iso = file.replace(/\..+$/, '')
        locales[iso] = require(path.join(localesPath, file))
      })
    }

    this.options.env.$pleasure = merge(get(this.options, 'env.$pleasure', {}), {
      locales
    })
  }

  this.options.build.watch.push(plsConfig.api.entitiesPath)
  this.options.build.watch.push(findRoot('./pleasure.config.js'))

  if (!this.options.build.postcss.plugins) {
    this.options.build.postcss.plugins = {}
  }

  this.options.build.postcss.plugins['postcss-nested'] = true
  this.options.build.postcss.plugins['postcss-preset-env'] = {
    stage: 4,
    /*
        autoprefixer: {
          grid: true
        }
    */
  }
  const postCssVariables = mapKeys(dot.dot(get(plsConfig, `nuxtPleasure.postCssVariables`, {})), (v, k) => kebabCase(k).replace(/-default$/, ''))

  this.options.build.postcss.plugins['postcss-css-variables'] = { variables: postCssVariables }
  this.options.build.postcss.plugins['postcss-hexrgba'] = true
  this.options.build.postcss.plugins['postcss-color-function'] = true
  this.options.build.postcss.plugins['postcss-calc'] = true

  // important
  this.options.build.transpile.push('pleasure', 'vue-pleasure', 'nuxt-pleasure')

  this.extendBuild((config) => {
    config.resolve.alias['@' + packageJson().name] = this.options.srcDir
    config.resolve.alias[path.relative(findRoot(), this.options.srcDir)] = this.options.srcDir
  })

  this.extendRoutes((routes, resolve) => {
    // read (view mode)
/*
    routes.push({
      path: '/pleasure/view/:entity',
      component: resolve(__dirname, '../lib/pages/pleasure-view.vue')
    })
*/

    // list
/*
    routes.push({
      path: '/pleasure/:entity',
      component: resolve(__dirname, '../lib/pages/pleasure-list.vue')
    })
*/

    // create
    routes.push({
      path: '/pleasure/create/:entity',
      component: resolve(__dirname, '../lib/pages/pleasure-create.vue')
    })

    // update
    routes.push({
      path: '/pleasure/:entity/:entry',
      component: resolve(__dirname, '../lib/pages/pleasure-update.vue')
    })

    // list
    /*
    - link to add
    - link to remove (select multiple)
    - list entries
    - search entries
    - filter
    - sort
     */
/*
    routes.push({
      path: '/pleasure/:entity/:entry',
      component: resolve(__dirname, '../lib/pages/pleasure-entry.vue')
    })
*/
  })
}

// REQUIRED if publishing the module as npm package
module.exports.meta = require(path.join(__dirname, '../package.json'))
