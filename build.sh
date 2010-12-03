#!/bin/bash
APP_NAME=piximguploader   # short-name, jar and xpi files name.
ROOT_FILES="install.rdf chrome.manifest" # put these files in root of xpi

TMP_DIR=build.tmp

rm $APP_NAME.xpi
rm -rf $TMP_DIR

mkdir $TMP_DIR

cp $ROOT_FILES $TMP_DIR
cp -r chrome $TMP_DIR/
cp -r content $TMP_DIR/
cp -r defaults $TMP_DIR/
cp -r locale $TMP_DIR/
cp -r skin $TMP_DIR/

cd $TMP_DIR
zip -r ../$APP_NAME.xpi *
cd ..

rm -rf $TMP_DIR
