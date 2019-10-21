#!/bin/bash

npm run build
git add -A .
git commit -m "."

git push gitlab master
git push github master
git push origin master

