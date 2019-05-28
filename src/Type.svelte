<script>
import { onMount } from 'svelte'
import Js from './JsonView.svelte'
import TypeField from './TypeField.svelte'


// P R O P S
export let parentid = ''
export let scheme = {}
export let typeName = ''
export let tree = {}
export let fieldList = ''


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

function getFields(n, level){
    let a =[]
    let p = '  '
    for (let key in n) {
        if (n[key].checked){
            a.push( p.repeat(level+1)+ key + getFields(n[key], level+1) )
        }
    }
    if (a.length > 0) {
        return '{\n' +a.join('\n') + '\n'+p.repeat(level)+ '}'
    }
    return ''
}

// function showTree(e) {
//     console.log(fieldList)
// }

function onFieldStateChange(e) {
   fieldList = getFields(tree,0) 
   console.log(e)
   console.log(fieldList)
}

onMount(async () => {
    fieldList = getFields(tree,0)
})

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
    .fieldlist {
        margin-bottom: 10px;
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
        <a class={vis?'opened':'closed'} href on:click|preventDefault={ e => vis = !vis }>{typeName}</a>
        <!-- {#if vis} -->
            <div class="frame" style="display:{vis?'block':'none'}">
                <span class="description">{node.description}</span>
                {#if node.fields}
                    <div class="fieldlist">
                    {#each node.fields as f}
                        <TypeField scheme={scheme} node={f} tree={tree} parentid="{parentid}-{typeName}" on:change={onFieldStateChange} />
                    {/each}
                    </div>
                {/if}
            </div>
        <!-- {/if} -->
    {/if}
    <!-- <input type="button" on:click={showTree} value="..."> -->
</div>
{/if}