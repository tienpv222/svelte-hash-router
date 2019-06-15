<script context='module'>
let level = 0
</script>

<script>
import { onDestroy } from 'svelte'
import { components } from '../utils/match'

let i = level++
onDestroy(() => level--)
</script>

<svelte:component this={$components[i]} {...$$props}/>
