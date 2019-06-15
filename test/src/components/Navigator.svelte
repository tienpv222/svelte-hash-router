<script>
import { active, matches } from '../../../src'
export let route = {}
export let deep = false
export let exact = false
export let pad = 0
export let root = true

let routes = Array.isArray(route) ? route : Object.values(route)
let style = `padding-left:${++pad * 20}px`
let isActive = r => exact ? r === $active : $matches.includes(r)
</script>

{#if root}
  <div class='root'>
    <svelte:self route={routes} {deep} root={false}/>
  </div>
{:else}
  {#each routes as r}
    <a
      class:active={isActive(r)} 
      href={r.$$href}
      {style}
      > {r.$$pathname}
    </a>
    {#if deep}
      <svelte:self route={r} {deep} {pad} root={false}/>
    {/if}
  {/each}
{/if}

<style>
.root {
  float: left;
  background: darkslategrey;
}

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