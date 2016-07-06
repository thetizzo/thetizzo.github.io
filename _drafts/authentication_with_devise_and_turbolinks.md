---
layout: post
title:  Authentication with Devise and Turbolinks
category: howto
date: 2016-07-05
---

I'm building a hybrid iOS app using Rails 5 with Turbolinks 5.  I also wanted to use Devise (v4.2) for authentication as I would in a normal Rails app.  This presented some challenges because Turbolinks documenation recommends that you handle form submissions with AJAX and this is not how Devise works out of the box.

#### Using Custom Views


To use custom views you need to set `config.scoped_views = true` in your `config/devise.rb` file. Then run `rails generate devise:views users` to have Devise generate the views in `app/views/users` or manually copy the views to that directory.

In order to enable the forms to make AJAX requests to the server we will need to use our own set of views so that we can add the `remote: true` flag to each form.

{% highlight erb %}
<%= form_for(resource, as: resource_name, url: registration_path(resource_name), remote: true) do |f| %>
  ...the rest of the form...
{% endhighlight %}

#### Using Semi-Custom Controllers

To make both sides of the AJAX forms work we will also need controllers that are capable of responding to JS requests.  First, tell Devise that we are going to use our own controllers by modifying the routes file like this:

{% highlight ruby %}
devise_for :users, controllers: { sessions: 'sessions', registrations: 'registrations' }
{% endhighlight %}

Then we need to make our own controllers that have the ability to respond to JS:

{% highlight ruby %}
class RegistrationsController < Devise::RegistrationsController
  respond_to :js
end

class SessionsController < Devise::SessionsController
  respond_to :js
end
{% endhighlight %}

That's surprisingly it for controllers. The rest is still handled by Devise.


#### Building the Sign Up Flow

To get the sign up flow to work we need both sides of the form.  Happy path sign up, which has been covered many other blogs and is fairly easy to get working, and the errors side of the form where we need to display some errors on the page and present the user with the form again.

On the form side we need to add the remote flag to the form like this:


At this point you should be able to submit the form with valid inputs and have the user get created on the back end but the page won't redirect the the `after_sign_in_path` like you would normally expect from Devise.  You may even see a MissingTemplate error for the create view.  To solve this we need to create a `create.js.erb` file that can execute some code to tell Turbolinks what to do on on the client.  I got this from [@packagethief's](https://github.com/packagethief) answer to this [GitHub Issue.](https://github.com/turbolinks/turbolinks/issues/85)

{% highlight erb %}
<% if resource.valid? %>
  Turbolinks.clearCache()
  Turbolinks.visit("<%= controller.after_sign_in_path_for(resource) %>", { action: 'replace' })
<% else %>
  $('form#new_user').replaceWith("<%=j render 'users/registrations/form' %>")
<% end %>
{% endhighlight %}

The else is for dealing with the error case which we will cover right now.

For errors, we have to re-render the form with the relevant flash messages.  Since the Devise RegistrationsController responds with a 200 status HTTP code in both success and error cases, the error case can also use the `create.js.erb` code to render the form with the relevant errors.

One caveat here is that we have to extract the form to a partial so that we can render just the form and let Turbolinks handle replacing it in the DOM.

At the end of this project I had 3 files in `views/users/registrations`; `_form.html.erb`,
`create.js.erb`, and `new.html.haml`.  

## Log In Flow


* remote true on form
* error listener on form
* create.js.erb
* controller
* xhr response on fail is a 401 so you need to add the listener to handle that kind of error
* need to render xhr alerts as well as regular alerts on the resource (example of regular, after log out flash message)

* SessionsController

{% highlight ruby %}
class SessionsController < Devise::SessionsController
  respond_to :js
end
{% endhighlight %}
