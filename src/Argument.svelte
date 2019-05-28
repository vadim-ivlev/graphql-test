<script>
import { onMount } from 'svelte'

// PROPS
export let node = {}
// export let checked = true
// export let name = node.name 
// export let value = node.defaultValue
// export let graphqlType = node.type.name || node.type.ofType.name

if (node.checked === undefined)     node.checked = true
if (node.value === undefined)       node.value = node.defaultValue
if (node.graphqlType === undefined) node.graphqlType = node.type.name || node.type.ofType.name




let input
let inputType = node.graphqlType=='Int'?'number':'text'


onMount(async () => {
    input.setAttribute('type', inputType)
})


</script>

<style>
    .field {
        margin-left: 20px;
        margin-top: 0.5em;
    }

    .description {
        color: steelblue;
        font-size: 90%;
        /* margin-left: 25px; */
    }
    .argname { 
        display: inline-block;
        min-width: 130px;
    }
    .input {
        width: 130px;
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

<!-- {@debug} -->
<div class="field" disabled={!node.checked}>  
    
    <input type="checkbox" bind:checked={node.checked} disabled={node.type.kind=='NON_NULL'}> 
    <!-- <br>  -->
    <span class="argname {node.checked?'':'disabled'}">{node.name}</span>
    <input class="input"  name={node.name} disabled={!node.checked} bind:value="{node.value}" bind:this={input} placeholder={node.value==''?'':null}>
    <span class="oftype {node.checked?'':'disabled'}">{node.graphqlType}{node.type.kind=='NON_NULL'?'!':''}</span> 
    <span class="description {node.checked?'':'disabled'}">{node.description}</span>
</div>
 