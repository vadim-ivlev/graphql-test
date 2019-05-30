<script>
import Func from './Func.svelte'
import Type from './Type.svelte'

export let scheme 
export let url 

let mutations =[]
let queries =[]
let types=[]
let usertypes=[]




$: try {
    mutations = scheme.data.__schema.mutationType.fields
    queries = scheme.data.__schema.queryType.fields
    types = scheme.data.__schema.types.sort(compareTypes)
    usertypes = scheme.data.__schema.types.filter(t => t.name[0]!='_' && t.kind == 'OBJECT' && t.name != 'Query' && t.name != 'Mutation').sort(compareTypes)
    } catch(e){}

function compareTypes(t1, t2) {
     if (t1.name > t2.name ){
          return 1
     } else if (t1.name < t2.name) {
          return -1
     } 
     return 0
}




</script>


<h4>Queries</h4>
{#each queries as e}
     <div>
        <Func url={url} node={e} operation="query"  scheme={scheme} parentid="query" on:change/>
     </div>
{/each}

<h4>Mutations</h4>
{#each mutations as e}
     <div>
        <Func url={url} node={e}  operation="mutation" scheme={scheme} parentid="mutation" on:change/>
     </div>
{/each}

<!-- <h4>User types</h4>
{#each usertypes as t}
     <div>
        <Type typeName={t.name} scheme={scheme} parentid="usertypes"/>
     </div>
{/each} -->

<!-- 
<h4>All types</h4>
{#each types as t}
     <div>
        <Type typeName={t.name}  scheme={scheme}/>
     </div>
{/each}
 -->
