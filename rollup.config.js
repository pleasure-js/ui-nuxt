const commonjs = require('rollup-plugin-commonjs')
const vue = require('rollup-plugin-vue')

module.exports = {
  input: 'src/pleasure-ui-nuxt.js',
  output: [
    {
      file: 'dist/pleasure-ui-nuxt.js',
      format: 'cjs'
    },
    {
      file: 'dist/pleasure-ui-nuxt.esm.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs(),
    vue()
  ]
}
