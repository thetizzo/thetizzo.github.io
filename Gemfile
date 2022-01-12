source 'https://rubygems.org'

# Helps versions stay in sync with what GitHub Pages is running in production
# since it is not always the "latest"
require 'json'
require 'open-uri'
versions = JSON.parse(::URI.open('https://pages.github.com/versions.json').read)

ruby versions['ruby']

gem 'github-pages', versions['github-pages']
