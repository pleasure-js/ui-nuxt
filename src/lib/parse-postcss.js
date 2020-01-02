import postcss from 'postcss'
import fs from 'fs'
import postCssVariables from 'postcss-css-variables'
import postCssExtend from 'postcss-extend'
import postCssEasings from 'postcss-easings'
import postCssNested from 'postcss-nested'
import postCssHexRgba from 'postcss-hexrgba'
import postCssColorFuntion from 'postcss-color-function'
import postCssCalc from 'postcss-calc'
import postCssPresetEnv from 'postcss-preset-env'
import mapKeys from 'lodash/mapKeys'
import kebabCase from 'lodash/kebabCase'
import merge from 'deepmerge'
import dot from 'dot-object'

export function parsePostCss (src, dest, { variables = {} } = {}) {
  if (!src || !dest) {
    throw new Error(`both src and dest are required`)
  }

  const defaultVariables = require('@pleasure-js/ui-vue/postcss.variables.js')

  variables = mapKeys(dot.dot(merge.all([{}, defaultVariables, variables])), (v, k) => kebabCase(k).replace(/-default$/, ''))

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
        fs.writeFile(dest, result.css, () => true)
        if (result.map) {
          fs.writeFile(`${ dest }.map`, result.map, () => true)
        }
      })
  }

  if (Array.isArray(src)) {
    const css = src.map((file) => {
      return fs.readFileSync(file).toString()
    }).join(`\n`)
    proceed(css)
  } else {
    fs.readFile(src, (err, css) => {
      proceed(css)
    })
  }
}
