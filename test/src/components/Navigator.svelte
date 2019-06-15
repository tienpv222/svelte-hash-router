<script>
import { matches, active } from '../../../src'
export let route = []
export let deep = false
export let pad = 0

$: routes = Array.isArray(route) ? route : Object.values(route)
$: style = `padding-left:${++pad * 20}px`
</script>

{#each routes as e}
  <a
    class:active={e === $active} 
    href={e.$$href}
    {style}
    > {e.$$pathname}
  </a>
  {#if deep}
    <svelte:self route={e} root={false} {deep} {pad}/>
  {/if}
{/each}
{#if !deep}
  <div class='divider'></div>
{/if}

<style>
a {
  display: block;
  padding: 3px 20px;
  color: white;
  text-decoration: none;
}

a:hover {
  background: #ffffff55;
}

a:active {
  background: #ffffff88;
}

a.active {
  color: darkslategray;
  background: lightgray;
}

.divider {
  height: 1px;
  background: lightgray;
}
</style>