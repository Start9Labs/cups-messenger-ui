#!/bin/bash


rm -rf www
ionic build --prod
tar -zcvf cups-minified.tar.gz www
