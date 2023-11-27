#!/usr/bin/env bash

# Ensure the output directory exists
mkdir -p output

# Read the path to the categories-topic file containing a mapping
# between categories and sub topics from the command line arguments
# and store it in a variable called categories_topic_file
categories_topic_file=$1

# Read the path to the input file containing the raw data from the
