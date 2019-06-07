import path from 'path';
import merge from 'deepmerge';
import castArray from 'lodash/castArray';
import kebabCase from 'lodash/kebabCase';
import forOwn from 'lodash/forOwn';
import get from 'lodash/get';
import Dot from 'dot-object';
import mapKeys from 'lodash/mapKeys';
import fs from 'fs';
import omit from 'lodash/omit';
import { getPlugins, getConfig } from 'pleasure-api';

const { pluginsConfig: { jwt: { authEndpoint, revokeEndpoint } } } = getPlugins();

const dot = new Dot('-');

// const plsConfig = getConfig()
const objToENVFormat = obj => {
  return mapKeys(dot.dot(obj), (v, k) => kebabCase(k).replace(/-/g, '_').toUpperCase())
};

const { entitiesUri, prefix, port, timeout } = getConfig();
const configEnv = objToENVFormat({
  pleasure: {
    client: {
      // todo: check if by ip is a better approach
      appURL: process.env.PLEASURE_CLIENT_APP_URL || `http://localhost:${ port }`,
      appServerURL: process.env.PLEASURE_CLIENT_APP_SERVER_URL || `http://app:${ port }`,
      prefix,
      entitiesUri,
      authEndpoint,
      revokeEndpoint,
      timeout
    }
  }
});

console.log(`configEnv>>>`, configEnv);

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

/**
 * Module pleasure-ui-nuxt
 * @param {NuxtPleasureConfig} options
 */
function Pleasure (options) {
  const { name, root, pleasureRoot } = options;
  let { config } = options;

  forOwn(config, (value, name) => {
    PleasureEnv[`$pleasure.${ name }`] = value;
  });

  // console.log({ _config, config, options, config })
  config = merge.all([{}, _config, config, omit(options, ['config', 'name', 'root', 'pleasureRoot'])]);

  Object.assign(this.options.env, configEnv, objToENVFormat({ pleasure: config }), PleasureEnv);

  console.log(`env>>>`, this.options.env);
  // console.log(`nuxt>>>`, this.options)
  this.options.modulesDir.push(...require.main.paths.filter(p => {
    return this.options.modulesDir.indexOf(p) < 0
  }));

  if (config.setupUiLibrary) {
    this.addPlugin(UiLibraryLocation[config.uiLibrary].setup);
    this.options.css.push(...castArray(UiLibraryLocation[config.uiLibrary].css));
  }

  this.addPlugin(resolve(`lib/nuxt-element-ui-pleasure-plugin.js`));
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
  const postCssVariables = mapKeys(dot.dot(get(config, `postCssVariables`, {})), (v, k) => kebabCase(k).replace(/-default$/, ''));

  this.options.build.postcss.plugins['postcss-css-variables'] = { variables: postCssVariables };
  this.options.build.postcss.plugins['postcss-hexrgba'] = true;
  this.options.build.postcss.plugins['postcss-color-function'] = true;
  this.options.build.postcss.plugins['postcss-calc'] = true;

  // important
  const addTranspile = ['pleasure', 'pleasure-ui-nuxt', 'pleasure-ui-vue', 'pleasure-api-client'];

  const findPkg = (pkgName, ...paths) => {
    return path.resolve(path.dirname(require.resolve(pkgName)), '../', ...paths)
  };

  const findNodeModules = pkgName => {
    return findPkg(pkgName, 'node_modules')
  };

  this.options.build.transpile.push(/pleasure/);

  this.options.modulesDir.unshift(...addTranspile.filter(v => v !== 'pleasure-ui-nuxt' && v !== 'pleasure').map(p => {
    return findNodeModules(p)
  }));

  this.options.modulesDir.unshift(path.join(__dirname, '..'));
  this.options.modulesDir.unshift(path.join(__dirname, '../node_modules'));

  // todo: add yarn global node_modules
  // console.log(this.options.modulesDir)

  this.extendBuild((config) => {
    config.resolve.alias['@' + name] = this.options.srcDir;
    config.resolve.alias[path.relative(root, this.options.srcDir)] = this.options.srcDir;

    Object.assign(config.resolve.alias, {
      pleasure: pleasureRoot
    });
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
      path: '/pleasure/create/:entity',
      component: resolve(__dirname, '../lib/pages/pleasure-create.vue')
    });

    // update
    routes.push({
      path: '/pleasure/:entity/:entry',
      component: resolve(__dirname, '../lib/pages/pleasure-update.vue')
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

  fs.writeFileSync(path.join(process.cwd(), 'final.config.json'), JSON.stringify(this.options, null, 2));
}

// REQUIRED if publishing the module as npm package
module.exports.meta = require(path.join(__dirname, '../package.json'));

export default Pleasure;
export { _config };
