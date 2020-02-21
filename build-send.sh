#!/bin/bash


rm -rf www
ionic build #--prod
tar -zcvf cups${1}.tar.gz www
scp cups${1}.tar.gz pi@start9-67a15e25.local:/home/pi
rm cups${1}.tar.gz
