<script>
import Link from '../components/Link.svelte'

let to = [
  '/a-link',
  'what-e-ver'
]
</script>

<div>All routes not matched will be redirected here</div>
<div>
  {#each to as e}
    <Link href='{`#` + e}' label={e}/>
  {/each}
</div>

<style>
div {
  font-size: 20px;
}
</style>