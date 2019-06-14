<script>
import { query } from '../../../src'
import Link from '../components/Link.svelte'

let to = [
  '?a&b',
  '?a=1&b=c'
]
</script>

<div>
  {#each to as e}
    <Link href='{`#/query` + e}' label={e}/>
  {/each}
</div>
<pre>
  {JSON.stringify($query, null, 2)}
</pre>

<style>
pre {
  margin: 10px;
  font-size: 20px;
}
</style>
