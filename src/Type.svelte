<script>
import Js from './JsonView.svelte'


// P R O P S
// export let scheme = {}
export let node = {}
// export let checked = true
// export let name 


let vis = false

// $: console.log("node=",node)

</script>

<style>
    .self{ 
        display: inline-block;
        vertical-align: top;
    }
    .description {
        color: green;
        margin-left: 10px;
        margin-bottom: 10px;
    }
    .name { 
        display: inline-block;
        min-width: 150px;
    }

    .fieldlist {
        margin-bottom: 10px;
    }
    .field {
        margin-left: 30px;
    }
    .closed::before {
        content: '\25B6';
        width:10px;
        display: inline-block;
    }
    .opened::before {
        content: '\25BC';
        width:10px;
        display: inline-block;
    }
</style>



<span class="self">

    <a class={vis?'opened':'closed'} href on:click|preventDefault={ e => vis = !vis }>{node.name} </a>
    <!-- <Js json={node} /> -->
    {#if vis}
        <div class="description"># {node.description}</div>
        {#if node.fields}
        <div class="fieldlist">
         {#each node.fields as f}
                <!-- {@debug} -->
              <div class="field">  
                <span class="name">{f.name}</span>
                <span class="description">{f.description}</span> 
                <svelte:self node={f.type} /> 
              </div>
         {/each}
        </div>
        {/if}
    {/if}

</span>