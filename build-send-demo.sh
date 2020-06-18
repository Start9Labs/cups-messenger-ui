#!/bin/bash

#rm cups${1}.tar.gz
#rm -rf www
#ionic build --prod
#npm run build-prod
#tar -zcvf cups${1}.tar.gz www
scp cups${1}.tar.gz root@demo.start9labs.com:/root/cups
ssh root@demo.start9labs.com "rm -rf /root/www && /bin/tar -zxvf /root/cups/cups${1}.tar.gz -C /root"
sha1sum cups${1}.tar.gz
#rm cups${1}.tar.gz
#ssh pi@start9-aec79475.local "sudo /home/pi/cups/pack.sh"
