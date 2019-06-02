<script>
// import { createEventDispatcher } from 'svelte'
import Type from './Type.svelte'



export let parentid = ''
export let scheme
export let node
// export let tree = {}
export let getText = function(e){
    if (checkboxElement.checked == false) return ''
    
    // let value = fieldName + typeComponent.getText()
    let value = fieldName + getTypeText()
    return value
}

// const dispatch = createEventDispatcher()
// function dispatchEvent(e) {
// 	dispatch('statechange', { text: 'State changed!', target: e.target })
// }


let checkboxElement
let typeComponent
let getTypeText
// let root
let checked = true
let fieldName = node.name
let typeName = node.type.kind == "LIST" ? node.type.ofType.name : node.type.name
// let treeNode 

// $: {
//     if (node) {
//         if (!tree[fieldName]) tree[fieldName]={}
//         tree[fieldName].checked = checked
//         tree[fieldName].typeName = typeName
//         treeNode=tree[fieldName]
//     }
// }


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
        color: slategray;
        /* margin-left: 10px; */
        margin-bottom: 10px;
        font-size: 80%
    }

    .field {
        margin-left: 30px;
    }


</style>


<div class="field">  
    <input id="{parentid}-{fieldName}-checkbox" type="checkbox" bind:this={checkboxElement} bind:checked={checked} on:change>
    <span class="field-name">{fieldName}</span>
    <Type scheme={scheme} bind:getText={getTypeText} typeName={typeName}  parentid="{parentid}-{fieldName}-type" on:change/> 
    <br><span class="field-description">{node.description}</span> 
</div>
