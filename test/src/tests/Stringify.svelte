<script context='module'>
import { routes, params } from '../../../src'
import Navigator from '../components/Navigator.svelte'
import Property from '../components/Property.svelte'

export let schema = {
  '/:id/:name': null
}
</script>

<script>
let current = 0
let values = [
  { id: '123', name: 'John' },
  { id: '456', name: 'Anne' },
  { id: '789', name: 'Rose' }
]

$: route = $routes[`/`][`stringify`]
</script>

<Navigator route='{$routes[`/`][`stringify`]}'/>
<div>
  {#each values as e, i}
    <button on:click='{()=>current=i}'>{e.id} - {e.name}</button>
  {/each}
  <Property value={values[current].name}/>
</div>

<style>
button {
  display: block;
  margin: 10px 20px;
  padding: 5px;
}
</style>
