

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

// var a = []
// for (let i=0; i<20; i++) a.push(i)


function findMinPosition(i0, i1, a) {
    let m=i0
    for (let i=i0; i<i1; i++)
        if (a[m] > a[i])
            m = i
    return m
}


function mySort(l,a){
    let m = 0
    for (let i=0; i<l; i++){
        m = findMinPosition(i,l,a);
        [a[i], a[m]] = [ a[m], a[i] ];
        console.log(a);
    }
}

l = 30
a= Array(l).fill().map( (v,i)=>i )


shuffle(a)
console.log(a)
console.log('-----------------------------')
mySort(l,a)
console.log(a)
