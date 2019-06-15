import { tick } from 'svelte'
import { derived } from 'svelte/store'
import { routes } from './routes'
import { pathname } from './path'

function map (routes, matches = []) {
  return Object.values(routes).reverse().map(e => [e, matches])
}

// Search for matching route
function parse (routes, pathname) {
  let stack = map(routes)

  while (stack.length) {
    let [active, matches] = stack.pop()
    let params = active.$$pattern.match(pathname)
    matches = [...matches, active]

    if (params) {
      return !active.$$redirect
        ? { active, params, matches }
        // redirect
        : tick().then(() => {
          history.replaceState(null, null, '#' + active.$$redirect)
          window.dispatchEvent(new Event('hashchange'))
        })
    }

    stack = stack.concat(map(active, matches))
  }
}

let match = derived([routes, pathname], ([$r, $p]) => parse($r, $p) || {})
let active = derived(match, $ => $.active || {}) // current active route
let params = derived(match, $ => $.params || {})
let matches = derived(match, $ => $.matches || []) // parents of active route and itself
let components = derived(matches, $ => $.map(e => e.$$component).filter(e => e))// components to use in <Router/>

export { active, params, matches, components }
