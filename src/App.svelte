<script>
// import { afterUpdate, onMount } from 'svelte'
import { afterUpdate } from 'svelte'

import Schemer from "./schemer/schemer.svelte";
import JsonView from "./JsonView.svelte"
import List from "./List.svelte"


export let parentid='tab1'
export let visible = true

// let url
let urlElement
let scheme = {}
// let ignoreChanges = true
let doTests
// let noscheme = true
let mainArea

let controls

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
    console.log('clearStorageItemScheme')
    // let key = parentid
    // let controls = getControlValues()
    // if (!controls || controls.length==0){
    //     console.log("No controls")
    //     return
    // }
    // let value = { 
    //     url: urlElement.value, 
    //     controls:controls,
    //     scheme:{}
    //     }
    // let controlsStr = JSON.stringify(value)
    // localStorage.setItem(key, controlsStr);
    // console.log('clearStorageItemScheme:', key, controlsStr.length)
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
        padding-top:60px;
    }
    input {
        font-size: 100%;
    }

    .button {
        padding: 2px 10px 2px 10px;
        border: 1px solid steelblue;
        border-radius: 2px;
        background-color: steelblue;
        color: white;
        font-size: 100%;
        height:24px;
        width:100px;
    }



    .hidden {display: none;}
    .visible {display: block;}

    .centered {
        /* border: 1px solid red; */
        display: grid;
        grid-template-columns:  max-content max-content;
        justify-content: center;
        
    }
</style>

<div class="hidden" class:visible>
<div class="root" >
    <span class="centered">
        <Schemer parentid="{parentid}-Schemer" bind:urlElement={urlElement}  bind:scheme={scheme} on:clear={clearStorageItemScheme} />
            <input type="button" class="button" on:click={doAllTests} value="test all" >
    </span>
    <div class="main" bind:this={mainArea}>
        <List parentid="{parentid}-List" urlElement={urlElement} scheme={scheme} bind:doTests={doTests} />
    </div>
</div>
</div>

