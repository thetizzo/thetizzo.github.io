# Authentication with Devise and Turbolinks 5

### Assumptions:
* Rails 5 with Turbolinks 5
* Devise 4.1.1

The original goal here for me was to get the Devise Sign Up/Log In stuff working with Rails 5 and
Turbolinks 5 so that I could use the Turbolinks iOS template to build a hybrid app.  Turbolinks
documenation recommends that you handle form submissions with XHR.  Since this is not how Devise
works out of the box, there are some things to adjust.

First off, some basic Devise settings that are required.  Since we will need to AJAXify the way
Devise handles requests, we will need to use our own views and controllers so that we can modify
them as needed.  

* note: The resource I'm using Devise for in my application is User so I will be using User
in all of my examples.

To use your own views you need to set `config.scoped_views = true` in your `devise.rb` file and then
run either `rails generate devise:views users` to have devise generate the views in `app/views/users`
automatically or manually copy your views to that spot.

In your routes file you will need to add the following line so Devise knows that it is supposed to
use your custom controllers instead of the default Devise controllers.

{% highlight ruby %}
devise_for :users, controllers: { sessions: 'sessions', registrations: 'registrations' }`
{% endhighlight %}

## Sign Up Flow

To get the sign up flow to work we need both sides of the form.  Happy path sign up, which has been covered
many other blogs and is fairly easy to get working, and the errors side of the form where we need to
display some errors on the page and present the user with the form again.

To get happy path sign up working we need add our custom registrations controller that is capable of
handling XHR requests.

{% highlight ruby %}
class RegistrationsController < Devise::RegistrationsController
  respond_to :js
end
{% endhighlight %}

On the form side we need to add the remote flag to the form like this:

{% highlight erb %}
<%= form_for(resource, as: resource_name, url: registration_path(resource_name), remote: true) do |f| %>
  ...the rest of the form...
{% endhighlight %}

At this point you should be able to submit the form with valid inputs and have the user get created
on the back end but the page won't redirect the the `after_sign_in_path` like you would normally
expect from Devise.  You may even see a MissingTemplate error for the create view.  To solve this
we need to create a `create.js.erb` file that can execute some code to tell Turbolinks what to do on
on the client.  I got this from [@packagethief's](https://github.com/packagethief) answer to
this [GitHub Issue.](https://github.com/turbolinks/turbolinks/issues/85)

{% highlight erb %}
<% if resource.valid? %>
  Turbolinks.clearCache()
  Turbolinks.visit("<%= controller.after_sign_in_path_for(resource) %>", { action: 'replace' })
<% else %>
  $('form#new_user').replaceWith("<%=j render 'users/registrations/form' %>")
<% end %>
{% endhighlight %}

The else is for dealing with the error case which we will cover right now.

For errors, we have to re-render the form with the relevant flash messages.  Since the Devise
RegistrationsController responds with a 200 status HTTP code in both success and error cases, the
error case can also use the `create.js.erb` code to render the form with the relevant errors.

One caveat here is that we have to extract the form to a partial so that we can render just the form
and let Turbolinks handle replacing it in the DOM.

At the end of this project I had 3 files in `views/users/registrations`; `_form.html.erb`,
`create.js.erb`, and `new.html.haml`.  

*I will be trying to add comments to this blog soon so that I
don't have to list every single detail so if you need the details here then hopefully put a comment in*



## Log In Flow

* SessionsController

{% highlight ruby %}
class SessionsController < Devise::SessionsController
  respond_to :js
end
{% endhighlight %}
