import { routes, Router } from '../../src'
import App from './App.svelte'
import RootRoutes, { schema as _RootRoutes } from './tests/RootRoutes.svelte'
import NestedRoutes, { schema as _NestedRoutes } from './tests/NestedRoutes.svelte'

routes.set({
  '/': {
    $$component: App,
    'root-routes': { $$component: RootRoutes, ..._RootRoutes },
    'nested-routes': { $$component: NestedRoutes, ..._NestedRoutes }
  }
})

let app = new Router({
  target: document.body
})

export default app
