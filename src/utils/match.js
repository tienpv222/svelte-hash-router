import { tick } from 'svelte'
import { derived } from 'svelte/store'
import { routes } from './routes'
import { pathname } from './path'

// Search for matching route
function parse (active, pathname, notRoot, matches = []) {
  if (notRoot) {
    let params = active.$$pattern.match(pathname)
    if (params) {
      return !active.$$redirect
        ? { active, params, matches }
        // redirect
        : tick().then(() => {
          history.replaceState(null, null, '#' + active.$$redirect)
          window.dispatchEvent(new Event('hashchange'))
        })
    }
  }

  for (let e of Object.values(active)) {
    let result = parse(e, pathname, true, [...matches, e])
    if (result) return result
  }
}

let match = derived([routes, pathname], ([$r, $p]) => parse($r, $p) || {})
let active = derived(match, $ => $.active || {}) // current active route
let params = derived(match, $ => $.params || {})
let matches = derived(match, $ => $.matches || []) // parents of active route and itself
let components = derived(matches, $ => $.map(e => e.$$component).filter(e => e))// components to use in <Router/>

export { active, params, matches, components }
