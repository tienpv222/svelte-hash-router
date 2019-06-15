import svelte from 'rollup-plugin-svelte'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import browsersync from 'rollup-plugin-browsersync'

let dev = process.env.ROLLUP_WATCH

export default {
  input: 'test/src/index.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'test/bundle.js'
  },
  plugins: [
    svelte({
      dev,
      css: css => css.write('test/bundle.css')
    }),
    nodeResolve(),
    commonjs(),
    dev && browsersync({
      server: 'test',
      watch: true
    })
  ]
}
