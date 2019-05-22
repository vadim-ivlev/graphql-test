<script>
import Js from './JsonView.svelte'
// export let scheme = {}
export let node = {}

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
        min-width: 200px;
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

    <a class="name {vis?'opened':'closed'}" href on:click|preventDefault={ e => vis = !vis }>{node.name}( </a>
    <span class="description">{node.description}</span>
    {#if vis}
        
        {#if node.args}
        <div class="fieldlist">
         {#each node.args as f}
                <!-- {@debug} -->
              <div class="field">  
                <span class="name">{f.name}</span>
                <span class="kind">{f.type.kind}</span> 
                <span class="oftype">{f.type.name || f.type.ofType.name}</span> 
                <span class="description">{f.description}</span> 
                <!-- <svelte:self node={f.type} />  -->
              </div>
         {/each}
        &nbsp;&nbsp;&nbsp;&nbsp;)
        </div>
        {/if}
    
    {/if}
    
</span>