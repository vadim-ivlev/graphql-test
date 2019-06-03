<script>
// import { createEventDispatcher } from 'svelte'

import { onMount } from 'svelte'
import Js from './JsonView.svelte'
import TypeField from './TypeField.svelte'


// P R O P S
export let parentid = ''
export let scheme = {}
export let typeName = ''
// export let tree = {}
// export let fieldList = ''

export let getText = function () {
    // console.log("Type getText parentid=", parentid)
    let a =[]
    let p = '  '

    // if (!node || !node.fields) return ''
    // for (let f of node.fields) {
    //     // let v = f.component.getText()
    //     if (!f.getText) continue
    //     let v = f.getText()
        
    //     if (v){
    //         a.push( p + v )
    //     }
    // }

    for (let key in fieldFunctions) {
        // console.log(key)
        let v = fieldFunctions[key]()
        if (v){
            a.push( p + v )
        }
    }

    if (a.length > 0) {
        return '{\n' +a.join('\n') + '\n'+p+'}'
    }
    return ''
}

let fieldFunctions = {}



// let nodes 
let node = getNode(scheme, typeName)
let vis = false


// const dispatch = createEventDispatcher()
// function dispatchEvent(e) {
// 	dispatch('change', { text: 'State changed!', target: e.target })
// }




// function recalculate(){
//     if (scheme && scheme.data && scheme.data.__schema){
//         let nodes = scheme.data.__schema.types.filter(t =>  t.name == typeName )
//         if (nodes.length > 0) {
//             node = nodes[0]
//             // node = JSON.parse(JSON.stringify(nodes[0]))
//         }
//     } 
// }

// recalculate()

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





// function getFields(n, level){
//     let a =[]
//     let p = '  '
//     for (let key in n) {
//         if (n[key].checked){
//             a.push( p.repeat(level+1)+ key + getFields(n[key], level+1) )
//         }
//     }
//     if (a.length > 0) {
//         return '{\n' +a.join('\n') + '\n'+p.repeat(level)+ '}'
//     }
//     return ''
// }

// function showTree(e) {
//     console.log(fieldList)
// }

// function onFieldStateChange(e) {
// //    fieldList = getFields(tree,0) 
// //    fieldList = getText()
//    dispatchEvent(e)
// //    console.log(e)
// //    console.log(fieldList)
// }

// onMount(async () => {
//     // fieldList = getFields(tree,0)
//     fieldList = getText()    
// })

</script>

<style>

    .self{ 
        display: inline;
        vertical-align: top;
    }
    .description {
        color: slategray;
        /* margin-left: 10px; */
        margin-bottom: 10px;
        /* font-size: 90% */
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
        border-left: 1px dotted slategray;
        /* border-bottom: 1px dashed slategray; */
        /* rgba(0,0,0, 0.5);*/
        /* border-left: 1px solid rgba(0,0,0, 0.1); */
        /* border-top: 1px solid rgba(0,0,0, 0.1); */
        padding:5px;
        padding-top:0.5em;
        /* border-radius: 4px; */
        /* background-color: rgba(0,0,0, 0.04) */
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
                    {#each node.fields as f,ind}
                        <TypeField  bind:getText={fieldFunctions[f.name]} scheme={scheme} node={f} parentid="{parentid}-{typeName}" on:change />
                    <!-- on:change={onFieldStateChange} -->
                    <!-- tree={tree}  -->
                    <!-- bind:getText={f.getTypeText}   -->
                    {/each}
                    </div>
                {/if}
            </div>
        <!-- {/if} -->
    {/if}
    <!-- <input type="button" on:click={showTree} value="..."> -->
</div>
{/if}