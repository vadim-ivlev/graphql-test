<script>
import Js from './JsonView.svelte'
import Arg from './Argument.svelte'
// export let scheme = {}
export let node = {}

let vis = false

// $: console.log("node=",node)

</script>

<style>
    .self{ 
        /* display: inline-block; */
        /* vertical-align: top; */
        border: 1px solid transparent;
        margin-top: 10px;
        max-width: 400px;
    }

    .active {
        background-color: whitesmoke;
        /* padding: 10px; */
        border: 1px solid silver;
    }

    .name { 
        display: inline-block;
        min-width: 200px;
    }
    .description {
        /* display: inline-block; */
        color: green;
        /* margin-left: 10px; */
        /* margin-bottom: 10px; */
        /* width: 80%; */
        /* max-width: 300px; */
    }

    .closed::before {
        content: '\25B6';
        font-size: 70%;
        width:15px;
        display: inline-block;
    }

    .opened::before {
        content: '\25BC';
        font-size: 70%;
        width:15px;
        display: inline-block;
    }

    .buttons {
        text-align: right;
        padding: 10px;
    }

    input[type="button"] {
        font-size: 18px !important;
    }

</style>



<div class="self {vis?'active':''}">

    <span class="description">{node.description}</span><br>
    <a class="name {vis?'opened':'closed'}" href on:click|preventDefault={ e => vis = !vis }>{node.name}(...) </a>
    {#if vis}
        
        {#if node.args}
        <div class="fieldlist">
         {#each node.args as f}
          <Arg node={f} />
         {/each}
        <!-- &nbsp;&nbsp;&nbsp;&nbsp;) -->
        </div>
        {/if}
    
        
        <div class="buttons">
            <input type="button" value="show GraphQL">
            <input type="button" value="send">
        </div>
    {/if}
    
</div>