import path from 'path'
import merge from 'deepmerge'
import castArray from 'lodash/castArray'
import kebabCase from 'lodash/kebabCase'
import { getConfig, findRoot, tools } from 'pleasure'
import forOwn from 'lodash/forOwn'
import get from 'lodash/get'
import Dot from 'dot-object'
import mapKeys from 'lodash/mapKeys'

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

const nodeModule = (name = './') => {
  return resolve('node_modules', name)
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
 * @typedef NuxtModuleConfig
 * @property {UiLibrary} uiLibrary - The UiLibrary to use.
 */
export const config = {
  uiLibrary: UiLibrary.ELEMENT_UI,
  setupUiLibrary: true
}

/**
 * Module nuxt-pleasure.
 * @param {Object} options
 * @param {Object} [options.locales] - Activate i18n with these set of locales.
 * @function
 */
export default function Pleasure (options) {
  const plsConfig = getConfig(null, true)

  options = merge.all([{}, config, options])
  Object.assign(this.options.env, PleasureEnv)
  // console.log({ options })
  // console.log(`nuxt>>>`, this.options)
  this.options.modulesDir.push(nodeModule())
  this.options.modulesDir.push(path.join(require.resolve('vue-pleasure'), '../../node_modules')) // nasty but ;)

  if (options.setupUiLibrary) {
    this.addPlugin(UiLibraryLocation[options.uiLibrary].setup)
    this.options.css.push(...castArray(UiLibraryLocation[options.uiLibrary].css))
  }

  this.addPlugin(resolve(`lib/nuxt-element-ui-pleasure-plugin.js`))
  this.addPlugin(resolve(`lib/nuxt-pleasure-plugin.js`))
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

  this.options.build.transpile.push('pleasure', 'vue-pleasure', 'nuxt-pleasure')

  this.extendBuild((config) => {
    config.resolve.alias['@' + packageJson().name] = this.options.srcDir
    config.resolve.alias[path.relative(findRoot(), this.options.srcDir)] = this.options.srcDir
  })
}

// REQUIRED if publishing the module as npm package
module.exports.meta = require(path.join(__dirname, '../package.json'))
