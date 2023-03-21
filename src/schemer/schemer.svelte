<script>

import { createEventDispatcher } from 'svelte'
import { queryString } from "./schemer.js"
import JsonView from '../JsonView.svelte'

export let url = ""
export let scheme = {}
export let parentid =''
export let urlElement 
export let credentialsElement 

let errorsElement
let submitElement
let visible = false


const dispatch = createEventDispatcher()


export async function getSchema() {
    errorsElement.innerText = ''
    submitElement.classList.add("inprogress");
    // clearSchema()
    // // scheme = {}    
    try {

        // var ajaxOptions = {
        //     url: urlElement.value, 
        //     type: "POST", 
        //     xhrFields : { withCredentials: credentialsElement.checked} ,
        //     data: { query:queryString, variables: '{}'},
        // }
        // scheme =  await jQuery.ajax(ajaxOptions)
    

        let fetchOptions = {
            headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json'
            },
            method: "POST",  
            body: JSON.stringify({ query: queryString, variables: {}, operationName: "IntrospectionQuery" }) 
        }
        if (credentialsElement.checked){
            console.log("Sending with credentials included = ", credentialsElement.checked)
            fetchOptions.credentials = 'include' 
        }
        let resp = await fetch( urlElement.value, fetchOptions )
        let newScheme = await resp.json()
        clearSchema()
        scheme = newScheme 

    } catch (err) {
        console.error("get scheme error:", err)
        errorsElement.innerText = "get scheme error:" + err
    }
    submitElement.classList.remove("inprogress");
}

function clearSchema() {
    dispatch('clear', { text: 'clear storage' })
    console.log('Schemer: clearSchema:', parentid)
}


</script>

<style>
:global(.inprogress) {
    background-color: rgba(225, 0, 154, 0.13) !important;
}

    .text {
        width: 100%;
        font-size: 100%;
        padding:1px 10px;
        border-radius: 4px 0 0 4px;
        border: 1px solid silver;
        height: 28px;
    }
    .button {
        color: #E10098; 
        background-color: transparent;
        border: 1px solid #E10098;
        padding: 5px 15px 5px 15px;
        border-radius: 0 4px 4px 0;
        height: 32px;

        font-family: 'Roboto Condensed';
        font-size: 13px;
        font-weight: bold;
        
        letter-spacing: 0.1em;
        text-transform: uppercase;
        outline: none;
    }


    label {
        margin-left:0;
    }

    .row {
        display: grid;
        grid-template-columns: 1fr auto;
        column-gap: 21px;
        align-items: top;
    }

    .smaller {
        opacity: 0.5;
        font-size: 80%;
        letter-spacing: 0.05em;
    }

    .errors {
        color: red;
    }

</style>


<div>

  <form class="row" on:submit|preventDefault={getSchema}>
        <div>
            <input class="text" type="text" placeholder="https://yoursite.com/graphql" bind:this={urlElement} value={url} />
            <div>
                <input type="checkbox" id="sss5678" title="include credentials to requests" bind:this={credentialsElement}>
                <label for="sss5678" class="smaller">Include credentials</label>
            </div>
            <div class="errors" bind:this={errorsElement}></div>
        </div>
        <input type="submit" id='subm444' bind:this={submitElement} class="button" value="&#x21bb; reload schema" />
  </form>

  {#if Object.entries(scheme).length != 0 }
        <a href on:click|preventDefault={ e => {visible = ! visible} } >{visible?'Hide':'Show'} scheme</a><br><br>
  {/if}
  
  {#if visible}
        <JsonView json={scheme} />
  {/if}

</div>
