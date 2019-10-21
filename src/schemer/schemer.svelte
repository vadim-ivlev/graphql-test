<script>

import { createEventDispatcher } from 'svelte'
import { queryString } from "./schemer.js"
import JsonView from '../JsonView.svelte'

export let url = "https://auth-proxy.rg.ru/graphql"
export let scheme = {}
export let parentid =''
export let refreshScheme = getScheme
export let urlElement 
export let credentialsElement 


let visible = false


const dispatch = createEventDispatcher()


async function getScheme() {
    clearScheme()
    scheme = {}    
    try {

        // var ajaxOptions = {
        //     url: urlElement.value, 
        //     type: "POST", 
        //     xhrFields : { withCredentials: credentialsElement.checked} ,
        //     data: { query:queryString, variables: '{}'},
        // }
        // scheme =  await jQuery.ajax(ajaxOptions)
    

        let fetchOptions = {
            method: "POST",  
            body: JSON.stringify({ query: queryString, variables: "{}" }) 
        }
        if (credentialsElement.checked){
            console.log("Sending with credentials included = ", credentialsElement.checked)
            fetchOptions.credentials = 'include' 
        }
        let resp = await fetch( urlElement.value, fetchOptions )
        scheme = await resp.json()

    } catch (err) {
        console.error("get scheme error:", err)
        alert("get scheme error:" + err)
    }
}

function clearScheme() {
    //scheme = {}     
    dispatch('clear', { text: 'clear storage' })
    console.log('clearScheme:', parentid)
}


</script>

<style>

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
        /* line-height: 22px; */
        font-weight: bold;
        
        letter-spacing: 0.1em;
        text-transform: uppercase;
        /* position: relative; */
        /* top: -1.5px; */
    }

    .button:hover {
        /* border-color: #E10098; */
        /* color:white; */
        background-color: rgba(225, 0, 154, 0.103);
        transition: 0.3s;
    }

    .noborder {
        border-color: transparent;
        /* transition: 0.5s; */
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
        letter-spacing: 1px;
    }


</style>


<div>

  <form class="row" on:submit|preventDefault={getScheme}>
        <!-- <input type="checkbox" title="include credentials to requests" checked id="id-{parentid}-chk-credentials" bind:this={credentialsElement}>
        <input class="text" type="text" id="id-{parentid}-inp-url" name="id-{parentid}-inp-url" placeholder="GraphQL endpoint" bind:this={urlElement} value={url} /> -->
        <div>
            <input class="text" type="text" placeholder="GraphQL endpoint" bind:this={urlElement} value={url} />
            <div>
                <input type="checkbox" id="sss5678" title="include credentials to requests" bind:this={credentialsElement}>
                <label for="sss5678" class="smaller">Include credentials</label>
            </div>
        </div>
        <input type="submit"  class="button noborder0" value="&#x21bb; reload schema" />
  </form>

  {#if Object.entries(scheme).length != 0 }
        <a href on:click|preventDefault={ e => {visible = ! visible} } >{visible?'Hide':'Show'} scheme</a><br><br>
  {/if}
  
  {#if visible}
        <JsonView json={scheme} />
  {/if}

</div>
