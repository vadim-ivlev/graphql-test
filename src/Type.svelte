<script>
import Js from './JsonView.svelte'


// P R O P S
export let scheme = {}
// export let node = {}
export let typeName = ""
export let checked = true
// export let name 



let nodes 
let node 
let vis = false

function recalculate(){
    if (scheme && scheme.data && scheme.data.__schema){
        nodes = scheme.data.__schema.types.filter(t =>  t.name == typeName )
        if (nodes.length > 0) {
            node = nodes[0]
        }
    } 
}

recalculate()


// $: console.log("node=",node)

</script>

<style>
    .self{ 
        display: inline;
        vertical-align: top;
    }
    .description {
        color: gray;
        margin-left: 10px;
        margin-bottom: 10px;
        font-size: 90%
    }
    .field-name { 
        display: inline-block;
        min-width: 120px;
    }
    .field-description {
        color: steelblue;
        margin-left: 10px;
        margin-bottom: 10px;
        font-size: 90%
    }

    .fieldlist {
        margin-bottom: 10px;
    }
    .field {
        margin-left: 30px;
    }
    .opened {
        min-width: 65px;
        display: inline-block;
    }
    .closed {
        min-width: 65px;
        display: inline-block;
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

    .scalar-type {
        display: inline-block;
        margin-left:15px;
        color:darkred;
        min-width: 50px;
    }
    .list-type {
        display: inline-block;
        margin-left:15px;
        color:blue;
        min-width: 50px;
    }

    .frame {
        border: 1px solid gray;
        /* border-top: 1px solid gray; */
        padding:5px;
        border-radius: 8px;
    }

</style>



{#if node}
<div class="self">


    {#if node.kind=="SCALAR"}
         <span class="scalar-type">{typeName}</span>
    {:else}
        <a class={vis?'opened':'closed'} href on:click|preventDefault={ e => vis = !vis }>{typeName} </a>
        {#if vis}
            <div class="frame">
            <span class="description">{node.description}</span>
            {#if node.fields}
            <div class="fieldlist">
            {#each node.fields as f}
                    <!-- {@debug} -->
                <div class="field">  
                    <!-- {#if f.name=="images"}
                        {@debug f}
                    {/if} -->

                    <input type="checkbox" bind:checked={checked}>
                    <span class="field-name">{f.name}</span>
                    {#if f.type.kind == "LIST"}
                         <svelte:self scheme={scheme} typeName={f.type.ofType.name} /> 
                    {:else}
                         <svelte:self scheme={scheme} typeName={f.type.name} /> 
                    {/if}
                    <span class="field-description">{f.description}</span> 
                </div>
            {/each}
            </div>
            {/if}
            </div>
        {/if}

    {/if}
</div>
{/if}