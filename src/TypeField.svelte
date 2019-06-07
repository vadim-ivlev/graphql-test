<script>
import Type from './Type.svelte'

export let parentid = ''
export let scheme
export let node
export let showCheckbox = true

export let level = 0
export let padding = '  '

export let getText = function(e){
    if (! checkboxElement) return ''
    if (checkboxElement.checked == false) return ''
    let value = fieldName + getTypeText()
    return value
}


let fieldName = node.name
let typeName = node.type.kind == "LIST" ? node.type.ofType.name : node.type.name
let getTypeText
let checkboxElement

</script>

<style>
    .disabled>*>* {
        opacity: 0.5 !important;
    }

    .field-name { 
        display: inline-block;
        min-width: 120px;
    }

    .field-description {
        color: slategray;
        margin-bottom: 10px;
        font-size: 80%
    }

    .field {
        margin-left: 30px;
    }
</style>


<div class="field">  
    {#if showCheckbox}
        <input type="checkbox" checked id="{parentid}-{fieldName}" bind:this={checkboxElement}  on:change>
    {/if}
    <span class="field-name">{fieldName}</span>
    <Type scheme={scheme} typeName={typeName} {showCheckbox} {level} {padding} bind:getText={getTypeText}  parentid="{parentid}-{fieldName}-type"  on:change/> 
    <br><span class="field-description">{node.description}</span> 
</div>
