#!/bin/bash
FTP_SERVER="ftp://cstudios.sk"
FTP_USER="projekterik.cstudios.sk:Nt5!oBxS/m"

# Upload frontend build to root
cd "/Users/erik/Documents/vibe coding/projekty/frontend/dist"
curl -s -k -u "$FTP_USER" -Q "MKD assets" $FTP_SERVER/ || true

for file in *; do
    if [ -f "$file" ]; then
        curl -s -k -T "$file" -u "$FTP_USER" $FTP_SERVER/
    fi
done

for file in .*; do
    if [ -f "$file" ]; then
        curl -s -k -T "$file" -u "$FTP_USER" $FTP_SERVER/
    fi
done

for file in assets/*; do
    if [ -f "$file" ]; then
        curl -s -k -T "$file" -u "$FTP_USER" $FTP_SERVER/assets/
    fi
done

# Upload api into /api/
cd "/Users/erik/Documents/vibe coding/projekty/api"
curl -s -k -u "$FTP_USER" -Q "MKD api" $FTP_SERVER/ || true
for file in *.php; do
    curl -s -k -T "$file" -u "$FTP_USER" $FTP_SERVER/api/
done
