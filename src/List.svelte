<script>
import Func from './Func.svelte'
import Type from './Type.svelte'

export let scheme 

let mutations =[]
let queries =[]
let types=[]
let usertypes=[]
// let scalartypes =[]
// let objecttypes =[]




$: try {
    console.log("--------------")
    console.log(scheme)
    mutations = scheme.data.__schema.mutationType.fields
    queries = scheme.data.__schema.queryType.fields
    console.log(queries)
    types = scheme.data.__schema.types.sort(compareTypes)
    usertypes = scheme.data.__schema.types.filter(t => t.name[0]!='_' && t.kind == 'OBJECT' && t.name != 'Query' && t.name != 'Mutation').sort(compareTypes)
    console.log(usertypes)
    // scalartypes = scheme.data.__schema.types.filter(t => t.name[0]!='_' && t.kind != 'OBJECT' )
    // console.log(scalartypes)
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
        <Func node={e}/>
     </div>
{/each}

<h4>Mutations</h4>
{#each mutations as e}
     <div>
        <Func node={e}/>
     </div>
{/each}

<h4>User types</h4>
{#each usertypes as e}
     <div>
        <Type node={e}/>
     </div>
{/each}


<h4>All types</h4>
{#each types as e}
     <div>
        <Type node={e}/>
     </div>
{/each}


<!-- <h4>Scalar types</h4>
{#each scalartypes as e}
     <div>{e.name}</div>
{/each} -->
