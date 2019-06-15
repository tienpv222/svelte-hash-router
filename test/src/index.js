import { routes, Router } from '../../src'
import App from './App.svelte'
import RootRoutes, { schema as _RootRoutes } from './tests/RootRoutes.svelte'
import NestedRoutes, { schema as _NestedRoutes } from './tests/NestedRoutes.svelte'
import Wildcard, { schema as _Wildcard } from './tests/Wildcard.svelte'
import Optional, { schema as _Optional } from './tests/Optional.svelte'
import Params, { schema as _Params } from './tests/Params.svelte'

routes.set({
  '/': {
    $$component: App,
    'root-routes': { $$component: RootRoutes, ..._RootRoutes },
    'nested-routes': { $$component: NestedRoutes, ..._NestedRoutes },
    'wildcard': { $$component: Wildcard, ..._Wildcard },
    'optional': { $$component: Optional, ..._Optional },
    'params': { $$component: Params, ..._Params }
  }
})

let app = new Router({
  target: document.body
})

export default app
