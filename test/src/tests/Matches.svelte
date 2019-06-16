<script context='module'>
import { routes, matches } from '../../../src'
import Route1 from '../components/Route1.svelte'
import Route2 from '../components/Route2.svelte'
import Route3 from '../components/Route3.svelte'
import Navigator from '../components/Navigator.svelte'
import Property from '../components/Property.svelte'

export let schema = {
  '/route1': Route1,
  '/route2': {
    $$component: Route2,
    '/route3': Route3
  }
}
</script>

<Navigator route='{$routes[`/`][`matches`]}' deep={true} exact={true}/>
<div>
  {#each $matches as e}
    <Property value={e.$$pathname}/>
  {/each}
</div>
