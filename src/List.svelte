<script>
import Func from './Func.svelte'
import Type from './Type.svelte'

export let scheme 
// export let url 
export let urlElement
export let credentialsElement

export let parentid = ''

export let doTests = function (){
    for (let [key,f] of Object.entries(testFunctions) )  f()
}


let mutations =[]
let queries =[]
let types=[]
let usertypes=[]
let noscheme = true
let testFunctions = {}


$: {
    // console.log("List scheme changed")
    mutations =[]
    queries =[]
    types=[]
    usertypes=[]

    try {
    noscheme = Object.entries(scheme).length == 0
    mutations = scheme.data.__schema.mutationType.fields
    queries = scheme.data.__schema.queryType.fields
    types = scheme.data.__schema.types.sort(compareTypes)
    usertypes = scheme.data.__schema.types.filter(t => t.name[0]!='_' && t.kind == 'OBJECT' && t.name != 'Query' && t.name != 'Mutation').sort(compareTypes)
    } catch(e){}
}


function compareTypes(t1, t2) {     
     if (t1.name > t2.name ){
          return 1
     } else if (t1.name < t2.name) {
          return -1
     } 
     return 0
}



</script>

<style>
    .noscheme {display: none;}
</style>

<div class:noscheme>
     <!-- <input type="button" value="test" on:click={doTests}> -->
     <h4>Queries</h4>
     {#each queries as e (e.name)}
          <div>
          <Func credentialsElement={credentialsElement} urlElement={urlElement} bind:test={testFunctions[e.name]} node={e} operation="query"  scheme={scheme} parentid="{parentid}-query" />
          <!-- bind:test={e.test} -->
          <!-- on:change -->
          <!-- url={url} -->
          </div>
     {/each}

     <h4>Mutations</h4>
     {#each mutations as e (e.name)}
          <div>
          <Func credentialsElement={credentialsElement} urlElement={urlElement} bind:test={testFunctions[e.name]} node={e}  operation="mutation" scheme={scheme} parentid="{parentid}-mutation" />
          <!-- bind:test={e.test} -->
          <!-- on:change -->
          <!-- url={url} -->
          </div>
     {/each}

     <h4>User types</h4>
     {#each usertypes as t}
          <div>
          <Type showCheckbox={false} typeName={t.name} scheme={scheme} parentid="{parentid}-usertypes"/>
          </div>
     {/each}

     <!-- 
     <h4>All types</h4>
     {#each types as t}
          <div>
          <Type typeName={t.name}  scheme={scheme}/>
          </div>
     {/each}
     -->
</div>