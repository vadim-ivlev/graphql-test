<script>
// import { createEventDispatcher } from 'svelte'
import Type from './Type.svelte'



export let parentid = ''
export let scheme
export let node
export let tree = {}

// const dispatch = createEventDispatcher()
// function dispatchEvent(e) {
// 	dispatch('statechange', { text: 'State changed!', target: e.target })
// }



let root
let checked = true
let fieldName = node.name
let typeName = node.type.kind == "LIST" ? node.type.ofType.name : node.type.name
let treeNode 

$: {
    if (node) {
        if (!tree[fieldName]) tree[fieldName]={}
        tree[fieldName].checked = checked
        tree[fieldName].typeName = typeName
        treeNode=tree[fieldName]
    }
}


</script>

<style>
    .disabled>*>* {
        /* color: silver; */
        opacity: 0.5 !important;
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

    .field {
        margin-left: 30px;
    }


</style>


<div class="field" bind:this={root}>  
    <input type="checkbox" id="{parentid}-{fieldName}" bind:checked={checked} on:change>
    <span class="field-name">{fieldName}</span>
    <Type scheme={scheme} typeName={typeName} tree={tree[fieldName]} on:change/> 
    <span class="field-description">{node.description}</span> 
</div>
