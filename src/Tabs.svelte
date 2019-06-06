<script>
import {createEventDispatcher,onMount} from 'svelte'


export let tabs = []
export let active 

const dispatch = createEventDispatcher()

let defaultTab = {
    tabName: "onlinebc",
    url:"http://localhost:5000/"
}


function activate(e) {
    let tabName = this.getAttribute("data-tabName")
    active = tabs.find( t => t.tabName == tabName )
}

function getTabsFromLocalStorage() {
    let tabs =[]
    let keys = Object.keys(localStorage)
    for (let key of keys) {
        let str = localStorage.getItem(key)
        if (!str) continue
        let value = JSON.parse(str)
        // make a copy of string
        tabs.push( 
            {
                tabName:key,
                url:(' ' + value.url).slice(1)
            })
    }
    return tabs
}



function addTab(){
    let tabName = prompt("New tab name","")
    if (!tabName) return
    // while (tabs.includes(tabName)){
    while (tabs.some( tab =>  tabName == tab.tabName )){
        tabName = prompt(`"${tabName}" already exists. Please try again.`,tabName)
        if (!tabName) return
    }
    let newTab = {tabName: tabName, url:''}
    tabs = [...tabs, newTab]
    active = newTab
}


function deleteTabByName(tabName) {
    let tabData = localStorage.getItem(tabName)
    localStorage.removeItem(tabName)
    tabs = tabs.filter( t => t.tabName != tabName)
    active = tabs.length >0 ? tabs[0] : null
    return tabData
}

function deleteTab(){
    let tabName = this.getAttribute("data-tabName")
    deleteTabByName(tabName)
}

// fixLocalStorageData renames ids by chnaging tabName to newTabName
function fixLocalStorageData(controlsStr, tabName, newTabName) {
    if (!controlsStr) return controlsStr
    let val = JSON.parse(controlsStr)
    if (!val) return controlsStr
    if (!val.controls) return controlsStr

    for (let c of val.controls) {
        c.id = c.id.replace(tabName, newTabName)
    }
    // console.log(controls)

    return JSON.stringify(val)
}

function renameTab(){
    // create a new tab
    let tabName = active.tabName
    let tabUrl = active.url

    let newTabName = tabName
    // while (tabs.includes(newTabName)){
    while (tabs.some( tab =>  newTabName == tab.tabName )){
        newTabName = prompt(`Rename "${newTabName}"`,newTabName)
        if (!newTabName) return
    }

    // delete old tab
    let data = deleteTabByName(tabName)

   // add the new tab to UI, and activate it
    if (!newTabName) return
    let newTab = {
        tabName:newTabName,
        url:tabUrl
    }
    tabs = [...tabs, newTab]
    active = newTab

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
    let storedTabs = getTabsFromLocalStorage()
    tabs = storedTabs.length ==0 ? [defaultTab] : [...tabs, ...storedTabs]
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
        color: steelblue;
        overflow:hidden;
        position: relative;
        /* top: 10px; */
        /* font-weight: bold; */
    }
    .x:hover {
        border-color: steelblue;
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

    {#each tabs as tab (tab.tabName)}
        <span class="tab" class:active={tab.tabName == active.tabName} data-tabName={tab.tabName} on:click={activate}>{tab.tabName} 
            <span class="x" data-tabName={tab.tabName} on:click={deleteTab}>
                <span class="xx">&#x2716;</span>
            </span>
        </span>
    {/each}
    <span title="add new tab" class="tab plus" on:click={addTab}>+</span>
</div> 