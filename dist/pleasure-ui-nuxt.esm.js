import path from 'path';
import merge from 'deepmerge';
import castArray from 'lodash/castArray';
import kebabCase from 'lodash/kebabCase';
import forOwn from 'lodash/forOwn';
import get from 'lodash/get';
import dot$1 from 'dot-object';
import mapKeys from 'lodash/mapKeys';
import fs from 'fs';
import omit from 'lodash/omit';
import { getPlugins, getConfig as getConfig$1 } from 'pleasure-api';
import { getConfig, findConfig, findRoot } from 'pleasure-utils';
import postcss from 'postcss';
import postCssVariables from 'postcss-css-variables';
import postCssExtend from 'postcss-extend';
import postCssEasings from 'postcss-easings';
import postCssNested from 'postcss-nested';
import postCssHexRgba from 'postcss-hexrgba';
import postCssColorFuntion from 'postcss-color-function';
import postCssCalc from 'postcss-calc';
import postCssPresetEnv from 'postcss-preset-env';
import { mkdirpSync, ensureFileSync } from 'fs-extra';
import chokidar from 'chokidar';

function parsePostCss (src, dest, { variables = {} } = {}) {
  if (!src || !dest) {
    throw new Error(`both src and dest are required`)
  }

  const defaultVariables = require('pleasure-ui-vue/postcss.variables.js');

  variables = mapKeys(dot$1.dot(merge.all([{}, defaultVariables, variables])), (v, k) => kebabCase(k).replace(/-default$/, ''));

  const proceed = (css) => {
    postcss([
      postCssPresetEnv({
        stage: 4
      }),
      postCssNested(),
      postCssExtend(),
      postCssEasings(),
      postCssVariables({
        variables
      }),
      postCssHexRgba(),
      postCssColorFuntion(),
      postCssCalc()
    ])
      .process(css/*, { from: src, to: dest }*/)
      .then(result => {
        fs.writeFile(dest, result.css, () => true);
        if (result.map) {
          fs.writeFile(`${ dest }.map`, result.map, () => true);
        }
      });
  };

  if (Array.isArray(src)) {
    const css = src.map((file) => {
      return fs.readFileSync(file).toString()
    }).join(`\n`);
    proceed(css);
  } else {
    fs.readFile(src, (err, css) => {
      proceed(css);
    });
  }
}

const { pluginsConfig: { jwt: { authEndpoint, revokeEndpoint } } } = getPlugins();

const dot = new dot$1('-');

// const plsConfig = getConfig()
const objToENVFormat = obj => {
  return mapKeys(dot.dot(obj), (v, k) => kebabCase(k).replace(/-/g, '_').toUpperCase())
};

const { entitiesUri, prefix, port, timeout } = getConfig$1();
const configEnv = objToENVFormat({
  pleasure: {
    client: {
      // todo: check if by ip is a better approach
      appURL: process.env.PLEASURE_CLIENT_APP_URL || `http://localhost:${ port }`,
      appServerURL: process.env.PLEASURE_CLIENT_APP_SERVER_URL || `http://localhost:${ port }`,
      prefix,
      entitiesUri,
      authEndpoint,
      revokeEndpoint,
      timeout
    }
  }
});

// console.log(`configEnv>>>`, configEnv)

const PleasureEnv = {
  $pleasure: true,
  '$pleasure.settings': {
    ui: 'element-ui'
  }
};
/*
forOwn(plsConfig, (value, name) => {
  PleasureEnv[`$pleasure.${ name }`] = value
})
*/

const resolve = (...paths) => {
  return path.join(__dirname, '../', ...paths)
};

const nodeModule = (name) => {
  return require.resolve(name)
};

const UiLibrarySetup = {
  1: {
    name: 'element-ui',
    setup: path.join(__dirname, `../lib/setup-element-ui.js`),
    css: [
      nodeModule(`element-ui/lib/theme-chalk/display.css`),
      nodeModule(`pleasure-ui-nuxt/dist/element-ui-fa-icons.pcss`),
      /*nodeModule(`element-ui/packages/theme-chalk/lib/index.css`)*/
    ]
  },
  name: 'vuetify',
  2: {
    setup: path.join(__dirname, `../lib/setup-vuetify.js`),
    css: []
  }
};

/**
 * @enum {UiLibrary}
 */
const UiLibrary = {
  ELEMENT_UI: 1,
  VUETIFY: 2
};

/**
 * @typedef PleasureNuxtConfig
 * This object will also be loaded from the local configuration using the scope `config` an will be attached to
 * the process env.
 *
 * ```js
 * // pleasure.config.js
 * module.exports = {
 *   ui: {
 *     // ...{PleasureNuxtConfig}
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
 *   ui: {
 *     i18n: true,
 *     localesPath: 'locales/'
 *   }
 * }
 * ```
 */
const _config = {
  uiLibrary: UiLibrary.ELEMENT_UI,
  setupUiLibrary: true,
  localesPath: 'locales',
  i18n: true
};

function refreshCss (input, output) {
  const { postCssVariables: variables } = getConfig('ui', null, true);
  parsePostCss(input, output, { variables });
}

// console.log(`_getConfig()`, _getConfig())

/**
 * Module pleasure-ui-nuxt
 * @param {NuxtPleasureConfig} options
 */
function Pleasure (options) {
  const { name, root, pleasureRoot } = options;
  let { config } = options;

  // console.log({ _config, config, options, config })
  config = merge.all([_config, config, omit(options, ['config', 'name', 'root', 'pleasureRoot'])]);
  const objEnvFormat = objToENVFormat({ pleasure: getConfig() });
  // console.log({ 'this.options.env': this.options.env, configEnv, objEnvFormat, PleasureEnv })

  Object.assign(this.options.env, merge.all([configEnv, objEnvFormat, PleasureEnv]));

  // middleware for users auth

  /*
    if (!this.options.router.middleware) {
      this.options.router.middleware = []
    }
  */
  const loadSession = require.resolve('pleasure-ui-vue/src/lib/server-middleware-load-session.js');
  // console.log({ loadSession })
  this.addServerMiddleware(loadSession);

  // fs.writeFileSync(findRoot('config.json'), JSON.stringify(this.options))

  const middlewarePath = path.join(this.options.srcDir, 'middleware');
  mkdirpSync(middlewarePath);
  this.options.router.middleware.push('pleasure-middleware-load-session');
  // this.options.router.middleware.push(require('pleasure-ui-vue/src/lib/middleware-load-session.js'))

  this.nuxt.hook('build:compile', (payload) => {
    // console.log(`building from pleasure-nuxt`, payload)
  });

  const writeCss = () => {
    const baseCss = require.resolve('pleasure-ui-vue/dist/pleasure-ui-vue.pcss');
    const pleasureCss = require.resolve('pleasure-ui-vue/src/pleasure.pcss');
    refreshCss([baseCss, pleasureCss], localPleasureCss);
  };

  const writeElementUi = () => {
    refreshCss([require.resolve('pleasure-ui-vue/src/element-ui/element-ui.pcss'), require.resolve('pleasure-ui-vue/dist/pleasure-ui-vue-element.pcss')], localElementUi);
  };

  /*
  todo: when development env, monitor pleasure.config.js
    - when postCssVars change, then recompile css's
   */
  if (process.env.NODE_ENV !== 'production') {
    const watcher = chokidar.watch(findConfig(), {
      persistent: true
    });
    watcher.on('change', () => {
      writeCss();
      if (UiLibrarySetup[config.uiLibrary].name === 'element-ui') {
        writeElementUi();
      }
    });
  }

  // const baseCss = require.resolve('pleasure-ui-vue/dist/pleasure-ui-vue.pcss')
  const localPleasureCss = findRoot('.pleasure/pleasure.css');
  const localElementUi = findRoot('.pleasure/element-ui.css');

  ensureFileSync(localPleasureCss);

  writeCss();

  // this.options.css.push(baseCss)
  this.options.css.push(localPleasureCss);

  if (config.setupUiLibrary) {
    this.addPlugin(UiLibrarySetup[config.uiLibrary].setup);
    this.options.css.push(...castArray(UiLibrarySetup[config.uiLibrary].css));
  }

  // add element-ui postcss config
  if (UiLibrarySetup[config.uiLibrary].name === 'element-ui') {
    // todo: replace for local compiled css version
    writeElementUi();
    this.options.css.push(localElementUi);
  }

  forOwn(config, (value, name) => {
    PleasureEnv[`$pleasure.${ name }`] = value;
  });

  // console.log(`env>>>`, this.options.env)
  // console.log(`nuxt>>>`, this.options)
  /*
    this.options.modulesDir.push(...require.main.paths.filter(p => {
      return this.options.modulesDir.indexOf(p) < 0
    }))
  */

  const pleasurePlugin = resolve(`lib/nuxt-element-ui-pleasure-plugin.js`);
  this.addPlugin(pleasurePlugin);
  this.addPlugin(resolve(`lib/pleasure-ui-nuxt-plugin.js`));

  if (config.i18n) {
    this.addPlugin(resolve(`lib/nuxt-i18n-plugin.js`));
    const localesPath = path.resolve(this.options.srcDir, config.localesPath);
    const locales = {};
    if (fs.existsSync(localesPath)) {
      fs.readdirSync(localesPath).forEach(file => {
        if (!file || /\^.+$/.test(file)) {
          return
        }

        const iso = file.replace(/\..+$/, '');
        locales[iso] = require(path.join(localesPath, file));
      });
    }

    this.options.env.$pleasure = merge(get(this.options, 'env.$pleasure', {}), {
      locales
    });
  }

  /*
    this.options.build.watch.push(config.api.entitiesPath)
    this.options.build.watch.push(path.join(root, './pleasure.config.js'))
  */

  // this.options.build.plugins.push()
  /*this.options.build.babel.presets = [require.resolve('@babel/preset-env'), require.resolve('@nuxt/babel-preset-app')]*/

  /*if (!this.options.build.babel.plugins) {
    this.options.build.babel.plugins = []
  }
  this.options.build.babel.plugins.push('@babel/plugin-syntax-dynamic-import')*/

  if (!this.options.build.postcss.plugins) {
    this.options.build.postcss.plugins = {};
  }

  this.options.build.postcss.plugins['postcss-nested'] = true;
  this.options.build.postcss.plugins['postcss-preset-env'] = {
    stage: 4,
    /*
        autoprefixer: {
          grid: true
        }
    */
  };
  let postCssVariables = merge.all([{}, require('pleasure-ui-vue/postcss.variables'), get(config, `postCssVariables`, {})]);
  postCssVariables = mapKeys(dot.dot(postCssVariables), (v, k) => kebabCase(k).replace(/-default$/, ''));
  // console.log({ postCssVariables })

  this.options.build.postcss.plugins['postcss-css-variables'] = { variables: postCssVariables };
  this.options.build.postcss.plugins['postcss-easings'] = true;
  this.options.build.postcss.plugins['postcss-hexrgba'] = true;
  this.options.build.postcss.plugins['postcss-color-function'] = true;
  this.options.build.postcss.plugins['postcss-calc'] = true;

  // important
  const addTranspile = ['pleasure', 'pleasure-ui-nuxt', 'pleasure-ui-vue', 'pleasure-api-client', pleasurePlugin];
  const transpile = addTranspile.filter(v => /*v !== 'pleasure-ui-nuxt' &&*/ v !== 'pleasure');

  this.options.build.transpile.push(...transpile);
  if (!this.options.build.babel.include) {
    this.options.build.babel.include = [];
  }
  this.options.build.babel.include.push(...transpile);
  this.options.build.babel.include.push(findRoot());

  /*
    this.options.modulesDir.unshift(...transpile.map(p => {
      return findNodeModules(p)
    }))
  */

  // this.options.modulesDir.unshift(path.join(__dirname, '../node_modules'))

  const suiteNodeModules = path.join(__dirname, '../../../node_modules');
  const suitePath = path.join(__dirname, '../../../packages');

  if (fs.existsSync(suitePath) && fs.existsSync(suiteNodeModules)) {
    this.options.modulesDir.unshift(suiteNodeModules);
  }

  // this.options.modulesDir.push(path.join(require.resolve('pleasure-ui-vue'), 'node_modules'))

  // todo: add yarn global node_modules
  // console.log(this.options.modulesDir)

  this.extendBuild((config) => {
    config.resolve.alias['@' + name] = this.options.srcDir;
    config.resolve.alias[path.relative(root, this.options.srcDir)] = this.options.srcDir;

    Object.assign(config.resolve.alias, {
      pleasure: pleasureRoot
    });

    fs.writeFileSync(path.join(process.cwd(), 'final.config.json'), JSON.stringify(this.options, null, 2));
  });

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
      // todo: make path configurable via pleasure.config.js
      path: '/pleasure/create/:entity',
      component: require.resolve('pleasure-ui-vue/src/ui/pages/pleasure-create.vue')
    });

    // update
    routes.push({
      // todo: make path configurable via pleasure.config.js
      path: '/pleasure/update/:entity/:entry',
      component: require.resolve('pleasure-ui-vue/src/ui/pages/pleasure-update.vue')
    });

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
  });
}

// REQUIRED if publishing the module as npm package
module.exports.meta = require(path.join(__dirname, '../package.json'));

export default Pleasure;
export { _config, parsePostCss };
