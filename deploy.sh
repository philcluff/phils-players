#!/usr/bin/env bash

aws s3 sync . s3://BUCKET/PATH --exclude ".*"
