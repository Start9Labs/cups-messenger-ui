#!/bin/bash

rm cups${1}.tar.gz
rm -rf www
ionic build #--prod
tar -zcvf cups${1}.tar.gz www
scp cups${1}.tar.gz pi@start9-aec79475.local:/home/pi/cups
#rm cups${1}.tar.gz
