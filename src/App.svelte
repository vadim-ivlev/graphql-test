<script>
// import { afterUpdate, onMount } from 'svelte'
import { afterUpdate } from 'svelte'

import Schemer from "./schemer/schemer.svelte";
import JsonView from "./JsonView.svelte"
import List from "./List.svelte"


export let parentid ='tab1'
export let visible = true

export let url =''

let urlElement
let credentialsElement
let schemerElement

let scheme = {}
// let ignoreChanges = true
let doTests
// let noscheme = true
let mainArea

let controls


$: if (urlElement) {
    console.log("url=", url)
    urlElement.value = url
}

// $: {
//     scheme = scheme
//     // noscheme = Object.entries(scheme).length == 0
//     console.log('App scheme changed', scheme)
//     // ignoreChanges= true
//     // delay(restoreInputs, 500)
// }

function doAllTests() {
    doTests()
}


function getControlValuesByTagName(tag) {
    let a =[]
    if (!mainArea){
        return a
    }
    let inps=mainArea.getElementsByTagName(tag)  
    for (let inp of inps) {
        let id = inp.getAttribute("id")
        if (!id) continue
        if (id[0]=='-') console.log(id) // check wrong ids
        let type =  tag == 'textarea' ? 'textarea' :  inp.getAttribute("type")
        let value = inp.value
        let checked = inp.checked
        a.push({ id: id, type:type, checked:checked, value:value })
    }
    return a    
}


function getControlValues() {
    let inputs    = getControlValuesByTagName("input")
    let textareas = getControlValuesByTagName("textarea")
    return inputs.concat(textareas)
}


function restoreControlValues() {
    if (!controls) return
    let restored = 0
    for (let c of controls) {
        let inp = document.getElementById(c.id)
        if (!inp) {
            // console.log("No input:")
            continue
        }
        restored ++
        if (c.type == 'checkbox') {
            inp.checked = c.checked
        } else {
            inp.value = c.value
        }
    }
    console.log(restored, "condrols have been restored.")
}


function clearStorageItemScheme(){
    localStorage.removeItem(parentid)
    console.log('App: clearStorageItemScheme: ', parentid)
}

export function reloadSchema() {
    schemerElement.getSchema()
}

export function saveInputs() {
    let key = parentid
    let controls = getControlValues()
    if (!controls || controls.length==0){
        console.log("No controls")
        return
    }
    let value = { 
        url: urlElement.value,
        credentials: credentialsElement.checked,
        controls:controls,
        scheme:scheme
        }
    let controlsStr = JSON.stringify(value)
    localStorage.setItem(key, controlsStr);
    console.log("saved: ", key, controlsStr.length )
}


export function restoreInputs() {

    let key = parentid
    let controlsStr = localStorage.getItem(key)
    if (!controlsStr) return
    let value = JSON.parse(controlsStr)
    urlElement.value = value.url
    credentialsElement.checked = value.credentials
    scheme = value.scheme
    console.log("restored tab=", key, controlsStr.length )

    controls = value.controls
}


afterUpdate(() => {
    console.log("afterUpdate parentid=", parentid)
    restoreInputs()
    setTimeout(restoreControlValues, 0)
});


</script>

<style>
    .root {
        padding-top:20px;
        margin-left: 20px;
        margin-right:20px;
    }
    input {
        font-size: 100%;
    }

    .button {
        color: #E10098; 
        background-color: transparent;
        border: 1px solid #E10098;
        padding: 5px 15px 5px 15px;
        border-radius: 4px;
        height: 32px;

        font-family: 'Roboto Condensed';
        font-size: 80%;
        font-weight: bold;
        
        letter-spacing: 0.1em;
        text-transform: uppercase;
    }

    .row {
        /* border: 1px solid red; */
        display: grid;
        grid-template-columns:  1fr auto;
        justify-content: left;
        align-items: flex-start;
        column-gap: 10px;
    }

    .smaller {
        opacity: 0.5;
        font-size: 80%;
        letter-spacing: 0.05em;
    }

    .hidden {display: none;}
    .visible {display: block;}

</style>

<div class="hidden" class:visible>
    <div class="root" >
        <div class="smaller">Enter GraphQL endpoint. For example https://yoursite.com/graphql</div>
        <div class="row">
            <Schemer parentid="{parentid}-Schemer" bind:this={schemerElement} bind:credentialsElement={credentialsElement} bind:urlElement={urlElement}  bind:scheme={scheme} on:clear={clearStorageItemScheme} />
            <input type="button" class="button" on:click={doAllTests} value="run all tests" >
        </div>
        <div class="main" bind:this={mainArea}>
            <List parentid="{parentid}-List" credentialsElement={credentialsElement}  urlElement={urlElement} scheme={scheme} bind:doTests={doTests} />
        </div>
    </div>
</div>

