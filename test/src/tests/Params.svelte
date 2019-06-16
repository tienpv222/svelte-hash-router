<script context='module'>
import Router, { routes, params } from '../../../src'
import Route1 from '../components/Route1.svelte'
import Route2 from '../components/Route2.svelte'
import Route3 from '../components/Route3.svelte'
import Route4 from '../components/Route4.svelte'
import Navigator from '../components/Navigator.svelte'
import Property from '../components/Property.svelte'

export let schema = {
  '/id/name': Route1,
  '/:id/name': Route2,
  '/:id/:name': Route3,
  '*': Route4
}
</script>

<Navigator route='{$routes[`/`][`params`]}'/>
<div>
  {#each Object.entries($params) as e}
    <Property key={e[0]} value={e[1]}/>
  {/each}
  <Router/>
</div>
