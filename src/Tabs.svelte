<script>
import {createEventDispatcher,onMount} from 'svelte'


export let tabs = []
export let active = ""

const dispatch = createEventDispatcher()




let n = 3
function activate(e) {
    active = this.getAttribute("data-tab")
}

function getKeysFromLocalStorage() {
    return Object.keys(localStorage)
}



function addTab(){
    let tabName = prompt("New tab name","")
    if (!tabName) return
    while (tabs.includes(tabName)){
        tabName = prompt(`"${tabName}" already exists. Please try again.`,tabName)
        if (!tabName) return
    }
    tabs = [...tabs, tabName]
    active = tabName
}


function deleteTabByName(tab) {
    let tabData = localStorage.getItem(tab)
    localStorage.removeItem(tab)
    tabs = tabs.filter( e => e != tab)
    active = tabs.length >0 ? tabs[0] : ''
    return tabData
}

function deleteTab(){
    let tab = this.getAttribute("data-tab")
    deleteTabByName(tab)
}

// fixLocalStorageData renames ids by chnaging tabName to newTabName
function fixLocalStorageData(controlsStr, tabName, newTabName) {
    if (!controlsStr) return controlsStr
    let controls = JSON.parse(controlsStr)
    if (!controls) return controlsStr

    for (let c of controls) {
        c.id = c.id.replace(tabName, newTabName)
    }
    console.log(controls)

    return JSON.stringify(controls)
}

function renameTab(){
    // create a new tab
    let tabName = active
    let newTabName = tabName
    while (tabs.includes(newTabName)){
        newTabName = prompt(`Rename "${newTabName}"`,newTabName)
        if (!newTabName) return
    }

    // delete old tab
    let data = deleteTabByName(tabName)

   // add the new tab to UI, and activate it
    if (!newTabName) return
    tabs = [...tabs, newTabName]
    active = newTabName

    // move data 
    if (data){
        // it's not enough to save the old data by the new key,
        // We need to fix all ids.
        let fixedData = fixLocalStorageData(data, tabName, newTabName)
        localStorage.setItem(newTabName,fixedData)
    }
}


function saveTab(){
    dispatch('save', {tab: active} )
}

onMount(async () => {
    let storedTabs = getKeysFromLocalStorage()
    tabs = storedTabs.length ==0 ? ['onlinebc'] : [...tabs, ...storedTabs]
    active = tabs[0]
})


</script>

<style>
    .container {
        padding: 10px 0 0 0;
        /* background-color: whitesmoke; */
    }

    .plus {
        font-weight: bold;
        color:steelblue;
        cursor: pointer;
        position: relative;
        top:2px;
     }

    .tab {
        margin: 0;
        /* margin-right:10px; */
        display: inline-block;
        padding: 1px 1px 1px 10px;
        cursor: default;
        border-bottom: 2px solid transparent;
        color: steelblue;
        /* background-color: transparent; */
    }

    .active {
        /* display: inline-block;
        padding: 5px 20px 5px 20px;
        cursor: pointer; */

        background-color: white;
        border-bottom-color: steelblue;
        color: black;
        }
    .x {
        border-radius: 20px;
        border: 1px solid transparent;
        display: inline-block;
        font-size: 75%;
        width:14px;
        height: 14px;
        text-align: center;
        vertical-align:middle;
        margin-left:3px;
        background-color: transparent;
        color: silver;
        overflow:hidden;
        position: relative;
        /* top: 10px; */
        /* font-weight: bold; */
    }
    .x:hover {
        border-color: silver;
    }
    .xx {
        position: relative;
        top: -1px; 
    }

    .buttons {
        float: right;
    }
    .button {
        /* font-family: 'Roboto Condensed'; */
        /* font-weight: bold; */
        /* letter-spacing: 0.1em; */
        padding: 0 5px 0 5px;
        border: 1px solid steelblue;
        /* border-radius: 4px; */
        background-color: transparent;
        color: steelblue;
    }


</style>

<div class="container">
    {#if tabs && tabs.length > 0}
    <span class="buttons">
        <input type="button" class="button" title="rename active tab" value="rename" on:click={renameTab}>
        <input type="button" class="button" title="save active tab" value="save tab" on:click={saveTab}> 
    </span>
    {/if}

    {#each tabs as tab (tab)}
        <span class="tab" class:active={tab == active} data-tab={tab} on:click={activate}>{tab} 
            <span class="x" data-tab={tab} on:click={deleteTab}><span class="xx">&#x2716;</span></span>
        </span>
    {/each}
    <span title="add new tab" class="tab plus" on:click={addTab}>+</span>
</div> 