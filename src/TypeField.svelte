<script>
// import { createEventDispatcher } from 'svelte'
import Type from './Type.svelte'



export let parentid = ''
export let scheme
export let node
// export let tree = {}
export let getText = function(e){
    // console.log("TypeField getText() parentid = ", parentid, checkboxElement.checked)
    if (checkboxElement.checked == false) return ''
    
    // let value = fieldName + typeComponent.getText()
    let value = fieldName + getTypeText()
    // let value = fieldName + typeFieldList
    return value
}


// const dispatch = createEventDispatcher()
// function dispatchEvent(e) {
// 	dispatch('statechange', { text: 'State changed!', target: e.target })
// }



let root
let checked = true
let fieldName = node.name
let typeName = node.type.kind == "LIST" ? node.type.ofType.name : node.type.name
// let treeNode 
// let typeFieldList
let getTypeText

let checkboxElement
// let typeElement


// $: {
//     if (node) {
//         if (!tree[fieldName]) tree[fieldName]={}
//         treeNode=tree[fieldName]
//         treeNode.checked = checked
//         treeNode.typeName = typeName
//         treeNode.getText = getText
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


<div class="field" bind:this={root}>  
    <input type="checkbox" id="{parentid}-{fieldName}" bind:checked={checked} bind:this={checkboxElement}  on:change>
    <span class="field-name">{fieldName}</span>
    <Type scheme={scheme} typeName={typeName} bind:getText={getTypeText}  parentid="{parentid}-{fieldName}-type"  on:change/> 
    <!-- bind:fieldList={typeFieldList} -->
    <!-- tree={tree[fieldName]} -->
    <br><span class="field-description">{node.description}</span> 
</div>
