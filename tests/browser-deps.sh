#!/bin/sh
# Ubuntu 24.04 test libraries, extracted locally. No root or package installation.
set -eu
destination=${1:?Pass a temporary destination directory}
mkdir -p "$destination/debs" "$destination/lib"
destination=$(cd "$destination" && pwd)
cd "$destination/debs"
apt-get download libnspr4 libnss3 libatk1.0-0t64 libatk-bridge2.0-0t64 \
    libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 \
    libasound2t64 libatspi2.0-0t64 libxrender1 libxi6
for package in ./*.deb; do
    dpkg-deb -x "$package" "$destination/lib"
done
printf 'Browser libraries: %s/lib/usr/lib/x86_64-linux-gnu\n' "$destination"
