import svelte from 'rollup-plugin-svelte'
import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import browsersync from 'rollup-plugin-browsersync'

let production = !process.env.ROLLUP_WATCH

export default {
  input: 'examples/src/index.js',
  output: {
    sourcemap: true,
    format: 'iife',
    name: 'app',
    file: 'examples/bundle.js'
  },
  plugins: [
    svelte({
      dev: !production,
      css: css => css.write('examples/bundle.css')
    }),
    nodeResolve(),
    commonjs(),
    browsersync({
      server: 'examples',
      watch: !production,
      ignore: ['examples/src']
    })
  ]
}
