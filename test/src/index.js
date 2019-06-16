import { routes, Router } from '../../src'
import App from './App.svelte'
import RootRoutes, { schema as _RootRoutes } from './tests/RootRoutes.svelte'
import NestedRoutes, { schema as _NestedRoutes } from './tests/NestedRoutes.svelte'
import WithoutComponent, { schema as _WithoutComponent } from './tests/WithoutComponent.svelte'
import Wildcard, { schema as _Wildcard } from './tests/Wildcard.svelte'
import Optional, { schema as _Optional } from './tests/Optional.svelte'
import Redirect, { schema as _Redirect } from './tests/Redirect.svelte'
import Params, { schema as _Params } from './tests/Params.svelte'
import Query from './tests/Query.svelte'
import Active, { schema as _Active } from './tests/Active.svelte'
import Matches, { schema as _Matches } from './tests/Matches.svelte'
import Stringify, { schema as _Stringify } from './tests/Stringify.svelte'
import FreezeRoutes from './tests/FreezeRoutes.svelte'

routes.set({
  '/': {
    $$component: App,
    'root-routes': { $$component: RootRoutes, ..._RootRoutes },
    'nested-routes': { $$component: NestedRoutes, ..._NestedRoutes },
    'without-component': { $$component: WithoutComponent, ..._WithoutComponent },
    'wildcard': { $$component: Wildcard, ..._Wildcard },
    'optional': { $$component: Optional, ..._Optional },
    'redirect': { $$component: Redirect, ..._Redirect },
    'params': { $$component: Params, ..._Params },
    'query': Query,
    'active': { $$component: Active, ..._Active },
    'matches': { $$component: Matches, ..._Matches },
    'stringify': { $$component: Stringify, ..._Stringify },
    'freeze-routes': FreezeRoutes
  }
})

let app = new Router({
  target: document.body
})

export default app
