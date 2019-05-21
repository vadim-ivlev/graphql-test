<script>
import Js from './JsonView.svelte'
// export let scheme = {}
export let node = {}

let vis = false

$: console.log("node=",node)

</script>

<style>
    .description {
        color: silver;
    }
</style>



<div>
    <div>{node.name}
    
    <span class="description">{node.description}</span>
    </div>
    <a href on:click|preventDefault={ e => vis = !vis }>{vis?'hide':'show'}</a>
    {#if vis}
         {#each node.fields as f}
                <!-- {@debug} -->
              <div>{f.name}</div>
              <!-- <Js json={f} /> -->
         {/each}
    {/if}

</div>