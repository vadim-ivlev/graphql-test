<script>
import { onMount } from 'svelte'

// PROPS
export let node = {}
export let checked = true
export let name = node.name 
export let value = node.defaultValue
export let graphqlType = node.type.name || node.type.ofType.name

let input
let inputType = graphqlType=='Int'?'number':'text'

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
        margin-left: 25px;
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


<!-- {@debug} -->
<div class="field" disabled={!checked}>  
    
    <input type="checkbox" bind:checked={checked} disabled={node.type.kind=='NON_NULL'}> 
    <!-- <br>  -->
    <span class="argname {checked?'':'disabled'}">{name}</span>
    <input class="input"  name={name} disabled={!checked} bind:value="{value}" bind:this={input}>
    <span class="oftype {checked?'':'disabled'}">{graphqlType}{node.type.kind=='NON_NULL'?'!':''}</span> 
    <div class="description {checked?'':'disabled'}">{node.description}</div>
</div>
 