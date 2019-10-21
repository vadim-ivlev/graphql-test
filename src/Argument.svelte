<script>
import { onMount } from 'svelte'

// P R O P S
export let parentid = ''
export let node = {}
export let getText = function() {
    if (!checkboxElement.checked) return ''
    let value = inputElement.value
    // if (inputType == 'text' && graphqlType == 'String'){
    if (graphqlType == 'String'){
      value = `"${value.replace(/"/g,'\\"')}"` 
    }
   return `${node.name}: ${value}`
}

// if (node.checked === undefined)     node.checked = true
// if (node.graphqlType === undefined) node.graphqlType = node.type.name || node.type.ofType.name
// if (node.value === undefined)       node.value = node.defaultValue ||  (node.graphqlType=='Int'? 0 : node.name.replace(/_/g,' '))

let checked = true
let graphqlType = node.type.name || node.type.ofType.name
let value
if (node.defaultValue){
    value = graphqlType == "String" ? node.defaultValue.replace(/"/g,'') : node.defaultValue
}else {
    value = (graphqlType=='Int'? 0 :  graphqlType=='Boolean'? false : graphqlType=='String'? node.name.replace(/_/g,' '): null )
}


let checkboxElement
let inputElement
let inputType = graphqlType=='Int'?'number':'text'



onMount(async () => {
    inputElement.setAttribute('type', inputType)
})


</script>

<style>
    .field {
        margin-left: 10px;
        margin-top: 0.5em;
    }

    .description {
        color: slategray;
        font-size: 90%;
    }

    .argname { 
        display: inline-block;
        min-width: 130px;
    }

    .oftype { 
        display: inline-block;
        min-width: 50px;
        color: steelblue;
        font-size: 90%;

    }

    .disabled {
        color: silver;
    }

    .exclamation {
        font-weight: bold;
        color: red;
    }

    .input {
        width: 130px;
    }

    input {
        font-size: inherit;
        border: 1px solid slategray;

    }

    input:disabled {
    color: silver;
    background-color: whitesmoke;
    border: 1px solid silver;
}



</style>

<!-- <svelte:options accessors={true}/> -->

<div class="field" >  
    <input id="{parentid}-{node.name}-checkbox" type="checkbox" bind:this={checkboxElement} bind:checked={checked} disabled={node.type.kind=='NON_NULL'}  on:change> 
    <span class="argname {checked?'':'disabled'}">{node.name}</span>
    <input id="{parentid}-{node.name}-input" class="input"  name={node.name} disabled={!checked} bind:value="{value}" bind:this={inputElement} placeholder={value==''?'':null} on:change>
    <span class="oftype {checked?'':'disabled'}">{graphqlType}
    <span class="exclamation">{node.type.kind=='NON_NULL'?' !':''}</span>
    </span> 
    
    <br><span class="description {checked?'':'disabled'}">{node.description}</span>
</div>
 