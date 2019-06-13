<script>
import { matches, active } from '../../../src'
export let route = {}
export let root = true
export let deep = false
export let pad = 0

$: routes = typeof route === 'object' ? Object.values(route) : route
$: style = `padding-left:${++pad * 20}px`
</script>

{#each routes as r}
  <a
    class:active={r === $active} 
    href={r.$$href}
    {style}
    > {r.$$name || r.$$pathname}
  </a>
  {#if !root || deep && $matches.includes(r)}
    <svelte:self route={r} root={false} {deep} {pad}/>
    {#if root}
      <div class='divider'></div>
    {/if}
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