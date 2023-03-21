Setup
-----

After git clone:

    npm i


----
Development
----


Start development

    sh/start.sh

or

    npm run dev

Test in electron

    npm run e

or 

    npm run electron

-----
Building executables
----

Build Linux and Windows executables

    sh/build-win-linux-distr.sh

Build Mac executable under Mac OS

    npm run dist

----
Deploying to now.sh
----

    sh/deploy.sh

---
Pushing to git
---

    sh/push.sh


----
GIT Large File Storage
---

    git lfs install


https://stackoverflow.com/questions/31529772/how-to-set-app-icon-for-electron-atom-shell-app


Samples of running in browser
----

http://localhost:5000/?tabs=tabs/grapher.json&runjavascript

http://localhost:5000/?tabs=tabs/tabs5.json&selectedtab=1.%20broadcast%20354&run=all

Three distance
```javascript
var getCameraDistanceFrom = function(camera,x,y,z) {
    var cameraDistance = new THREE.Vector3();
    var target = new THREE.Vector3(x,y,z);
    cameraDistance.subVectors(camera.position, target);
    return cameraDistance.length();
};
```

