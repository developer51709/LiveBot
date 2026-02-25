#!/bin/bash

PACKAGE="npx @electron/packager"

BIN_LIN="livebot-linux-x64"
BIN_OSX="livebot-darwin-x64"
BIN_WIN="livebot-windows-x64"

# Make sure the patch is applied
tar -xvf patch.tar

# Create and move into the build directory, perform the build
mkdir build
cd build

$PACKAGE ../ --platform=darwin,linux,win32 --arch=x64 --icon=../resources/icons/logo

tar -czvf "$BIN_LIN".tar.gz "$BIN_LIN" &
tar -czvf "$BIN_OSX".tar.gz "$BIN_OSX" &
zip -rv "$BIN_WIN".zip livebot-win32-x64

gpg -ab "$BIN_LIN".tar.gz
gpg -ab "$BIN_OSX".tar.gz
gpg -ab "$BIN_WIN".zip

gpg --verify "$BIN_LIN".tar.gz.asc
gpg --verify "$BIN_OSX".tar.gz.asc
gpg --verify "$BIN_WIN".zip.asc

echo
echo "Your releases have been created in $(pwd)"

wait
