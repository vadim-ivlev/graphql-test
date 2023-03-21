<script>
import {createEventDispatcher,onMount} from 'svelte'
import Dialog from './Dialog.svelte'

export let tabs = []
export let active 
let dialog

const dispatch = createEventDispatcher()

// let defaultTab = {
//     tabName: "auth-proxy",
//     url:"https://auth-proxy.rg.ru/schema",
//     scheme: null
// }


function activate(e) {
    let tabName = this.getAttribute("data-tabName")
    active = tabs.find( t => t.tabName == tabName )
}

function getTabsFromLocalStorage() {
    let tabs =[]
    let keys = Object.keys(localStorage)
    keys.sort()
    for (let key of keys) {
        let str = localStorage.getItem(key)
        if (!str) continue
        let value = JSON.parse(str)
        // make a copy of string
        tabs.push( 
            {
                tabName:key,
                url:(' ' + value.url).slice(1),
                scheme:value.scheme
            })
    }
    return tabs
}

export function addNewTab(tabName, url) {
    let newTab = {tabName: tabName, url:url}
    tabs = [...tabs, newTab]
    active = newTab
    dispatch('save', {tab: active} )
}

function addTab(){
    dialog.showDialog("Enter a new tab name","new", onAddTabOk)
}

function onAddTabOk(tabName){
    if (!tabName) return
    if (tabs.some( tab =>  tabName == tab.tabName )){
        dialog.showDialog(`"${tabName}" already exists. Please try again.`,tabName, onAddTabOk)
        return
    }
    addNewTab(tabName, 'https://auth-proxy.rg.ru/graphql')
}



export function setActiveTabByName(name) {
    let ind = tabs.findIndex( t => t.tabName == name )
    if (ind == -1) {
        return
    }
    active = tabs[ind]
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

function exportTab() {
    let tabName = this.parentElement.parentElement.getAttribute("data-tabName")
    let fileContent = localStorage.getItem(tabName)

    // save tab name into data
    let data = JSON.parse(fileContent)
    data.tabName = tabName
    let modifiedFileContent = JSON.stringify(data)


    // var fileContent = JSON.stringify(active);
    var bb = new Blob([modifiedFileContent], { type: 'text/plain' });
    var a = document.createElement('a');
    a.download = active.tabName+'.json';
    a.href = window.URL.createObjectURL(bb);
    a.click();    
}

function importTab(){
    document.getElementById('fileChooser').click()
}


function openFile(event) {
    var input = event.target;
    var reader = new FileReader();
    reader.onload = function(){
        importTabFromData(reader.result)
    }
    reader.readAsText(input.files[0])
}

// importTabFromData creates a tab from erlier exported data
function importTabFromData(text) {
    if (!text) 
        return
    var newTab = JSON.parse(text)
    if (!newTab)
        return
    var tabName = newTab.tabName
    if (!tabName) 
        return

    // save imported tab
    localStorage.setItem(tabName,text)
    
    // restore tabs from local storage
    let storedTabs = getTabsFromLocalStorage()
    // tabs = storedTabs.length ==0 ? [defaultTab] : storedTabs
    tabs = storedTabs
    active = newTab
}


function renameTab(){
    // create a new tab
    let tabName = active.tabName
    let tabUrl = active.url
    let tabScheme = active.scheme

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
        url:tabUrl,
        scheme: tabScheme
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


onMount(async () => {
    let storedTabs = getTabsFromLocalStorage()
    tabs = storedTabs.length ==0 ? [] : storedTabs
    active = tabs[0]
    dispatch('mounted')
})


</script>

<style>
    .container {
        font-size: 14px;
        padding: 25px 0 0 20px;
        /* background-color: whitesmoke; */
        /* background-color: black; */
        background-image: linear-gradient(to right, whitesmoke, transparent, transparent);
        border-bottom:1px solid silver;
        border-image-source: linear-gradient(to right, silver, transparent);
        border-image-slice: 1;
        margin-bottom:30px;
    }


    .tab {
        margin: 0;
        display: inline-block;
        padding: 2px 4px 2px 20px;
        cursor: default;
    
        /* color: steelblue; */
        color: gray;
        border-radius: 3px 3px 0 0;
        border:1px solid transparent;
        border-top-width: 2px;

        top: 1px;
        position: relative;
    }

    .tab:hover .x {
        visibility: visible;
    }


    .active {
        background-color: white;
        border:1px solid silver;
        border-top-width: 2px;
        border-bottom: 1px solid white;        
        border-top-color: #E10098;
        color: black;
        }


    .active:hover .tabmenu {
        opacity: 1.0;
    }


    .active .x {
        color: #E10098;
        visibility: visible;
    }

    .x {
        padding:0 3px 0 3px;
        /* font-size: 90%; */
        margin-left:3px;
        color: gray;
        visibility: hidden;
    }
    .x:hover {
        color: #E10098;
    }

    .button-tiny {
        padding: 0 3px 0 3px;
        border: 1px solid transparent;
        border-radius: 4px;
        background-color: transparent;
        color: #E10098;
        cursor: pointer;
        border-radius: 20px;
    }
    .button-tiny:hover {
        border: 1px solid #E10098;
    }

    .tabmenu {
        position: absolute;
        top: 25px;
        width: 100%;
        left:0;
        text-align: center;
        display:none;
        word-wrap: none;
        white-space: nowrap;
        opacity: 0.0;
        transition: 0.3s;
        padding-top:6px;
    }
    .active .tabmenu {
        display: block;
    }

</style>

<div class="container">
    <Dialog bind:this={dialog}></Dialog>
    {#each tabs as tab (tab.tabName)}
        <span class="tab" class:active={tab.tabName == active.tabName} data-tabName={tab.tabName} on:click={activate}>{tab.tabName} 
            <span class="x" title="delete {tab.tabName} tab" data-tabName={tab.tabName} on:click={deleteTab}>&#xd7;</span>
            <div class="tabmenu">
                <input type="button" class="button-tiny" title="Rename {active.tabName} tab" value="rename" on:click={renameTab}>
                <input type="button" class="button-tiny" title="Save {active.tabName} to a file" value="export" on:click={exportTab}>
                <!-- &#8628; -->
            </div>
        </span>
    {/each}

    <span title="Add a new tab" class="button-tiny" style="font-weight:bold;" on:click={addTab}>&nbsp;&nbsp;&nbsp; &#xFF0B; &nbsp;&nbsp;&nbsp;</span>
    <span title="Import tab from a file" class="button-tiny" on:click={importTab}>import</span>
    <!-- &#8624; -->
    <input id="fileChooser" type='file' style="display:none" on:change={openFile} >
</div> 
<!-- &#x21ca; &#x21c8; &#x2297;  -->