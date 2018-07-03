---
layout: post
title: Using ActiveRecord Without Rails
category: howto
date: 2018-05-30
---

I have, on occasion, felt like using a database for a Ruby project that didn't need all the overhead of Rails.  While there are certainly other Ruby ORMs, I am already well versed in ActiveRecord so I decided to figure out how to use it outside of the normal Rails environment.  Here is a story about what that took.

The first thing needed to get this shit working is to install the `activerecord` gem along with the gem for the database of your choice.  In this case, I'm using Postgres so I'm adding the following to my Gemfile:

{% gist thetizzo/17baa6ee271006b98d4b847c1c9cfb71 %}

At this point, I want to create a database the way I would normally do it... by doing `rake db:create`.  This means we need to add a create task to the `Rakefile` that knows how to create a database.  While we're at it, we might as well also add tasks for all the operations I would expect to be able to do with our database.  That is, `db:create`, `db:drop`, `db:migrate`, and `db:rollback`.  Normally these are automatically included in a Rails application, so I had to do some research to figure out what to call within ActiveRecord to perform these actions and ultimately I came up with the following:

{% gist thetizzo/93f6eb2e3cdefd4c0f7355ed8ab7d734 %}
