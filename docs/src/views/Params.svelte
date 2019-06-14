<script context='module'>
export let paramsRoutes = {
  '/id/John': '',
  '/:id/John': '',
  '/:id/:name': '',
  '*': ''
}
</script>

<script>
import { params } from '../../../src'
import Link from '../components/Link.svelte'

let to = [
  '/id/John',
  '/123/John',
  '/123/Ryan',
  '/whatever'
]
</script>

<div>
  {#each to as e}
    <Link href='{`#/params` + e}' label={e}/>
  {/each}
</div>
<pre>
  {JSON.stringify($params, null, 2)}
</pre>

<style>
pre {
  margin: 10px;
  font-size: 20px;
}
</style>
