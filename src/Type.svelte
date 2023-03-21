<script>

import Js from './JsonView.svelte'
import TypeField from './TypeField.svelte'


// P R O P S
export let parentid = ''
export let scheme = {}
export let typeName = ''
export let showCheckbox = true

export let level = 0
export let padding = '  '

export let getText = function () {
    let a =[]
    // let p = '  '

    for (let key in fieldFunctions) {
        let v = fieldFunctions[key]()
        if (v) a.push( padding.repeat(level+1) + v )
    }

    if (a.length > 0) 
        // return '\n'+ padding.repeat(level)+'{\n' +a.join('\n') + '\n'+ padding.repeat(level) +'}'
        return ' {\n' +a.join('\n') + '\n'+ padding.repeat(level) +'}'
    
    return ''
}

let fieldFunctions = {}
let node = getNode(scheme, typeName)
let vis = false



function getNode(scheme, typeName){
    if (scheme && scheme.data && scheme.data.__schema){
        let nodes = scheme.data.__schema.types.filter(t =>  t.name == typeName )
        if (nodes.length > 0) {
            return nodes[0]
        }
        return null
    } 
    return null
}


</script>

<style>

    .self{ 
        display: inline;
        vertical-align: top;
        margin-left:10px;
    }
    .description {
        color: slategray;
        margin-bottom: 10px;
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
        color:steelblue;
        min-width: 50px;
    }
    .list-type {
        display: inline-block;
        margin-left:15px;
        color:blue;
        min-width: 50px;
    }

    .frame {
        /* border-left: 1px dotted slategray; */
        /* border-bottom: 1px dotted slategray; */
        border: 1px dotted slategray;
        padding:5px;
        padding-left:2px;
        margin-left: 8px;
        padding-top:0.5em;
        max-width: max-content;
    }

</style>


{#if node}
<div class="self">
    {#if node.kind=="SCALAR"}
         <span class="scalar-type">{typeName}</span>
    {:else}
        <a class={vis?'opened':'closed'} href on:click|preventDefault={ e => vis = !vis }>{typeName}</a>
            <div class="frame" style="display:{vis?'block':'none'}">
                <span class="description">{node.description}</span>
                {#if node.fields}
                    <div class="fieldlist">
                    {#each node.fields as f,ind}
                        <TypeField {showCheckbox} {scheme}  level={level+1}  {padding}  node={f} parentid="{parentid}-{typeName}" bind:getText={fieldFunctions[f.name]}  on:change />
                    {/each}
                    </div>
                {/if}
            </div>
    {/if}
</div>
{/if}