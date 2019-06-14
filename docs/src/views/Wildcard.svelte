<script context='module'>
import Route1 from '../components/Route1.svelte'
import RouteAny from '../components/RouteAny.svelte'
import CatchAll from '../components/CatchAll.svelte'

export let wildcardRoutes = {
  '/route1': Route1,
  '/route*': RouteAny,
  '*': CatchAll
}
</script>

<script>
import { Router } from '../../../src'
import Link from '../components/Link.svelte'

let to = [
  '/route1',
  '/route-unknown',
  '/whatever'
]
</script>

<div>
  {#each to as e}
    <Link href='{`#/wildcard` + e}' label={e}/>
  {/each}
  <Router/>
</div>
