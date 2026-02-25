#!/bin/bash

PACKAGE="npx @electron/packager"

# Make sure the patch is applied
tar -xvf patch.tar

# Create and move into the build directory, perform the build
mkdir build
cd build

$PACKAGE ../ --platform=darwin,linux,win32 --arch=x64,arm64 --icon=../resources/icons/logo

# Archive
for dir in $(ls); do
	zip -rv "$dir".zip "$dir" &
done
wait

# Sign
for archive in $(ls *.zip); do
	gpg -ab "$archive"
	gpg --verify "$archive".asc
done

echo
echo "Your releases have been created in $(pwd)"
