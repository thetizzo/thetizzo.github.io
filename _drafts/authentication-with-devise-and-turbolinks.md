---
layout: post
title:  Authentication with Devise and Turbolinks
category: howto
date: 2016-07-19
---

I'm building a hybrid iOS app using Rails 5 with [Turbolinks 5](https://github.com/turbolinks/turbolinks).  I also wanted to use [Devise](https://github.com/plataformatec/devise) (v4.2) for authentication as I would in a normal Rails app.  This presented some challenges because [Turbolinks documentation](https://github.com/turbolinks/turbolinks#redirecting-after-a-form-submission) recommends that you handle form submissions with XHR and this is not how Devise works out of the box.

In order to make this work, we will need to use customized Devise views, custom Devise controllers, and a conveniently placed Javascript event listener.

#### Using Custom Views

To use custom views with Devise, you need to set turn on scoped views in your `config/devise.rb` file like so:

```ruby
config.scoped_views = true
```

Then run `rails generate devise:views users` to have Devise generate the views in `app/views/users` or manually copy the views to that directory.

#### Using Semi-Custom Controllers

To make both sides of the AJAX forms work we will also need controllers that are capable of responding to JS requests.  First, tell Devise that we are going to use our own controllers by modifying the routes file like this:

```ruby
devise_for :users, controllers: { sessions: 'sessions', registrations: 'registrations' }
```

Then we need to make our own controllers that have the ability to respond to JS:

```ruby
class RegistrationsController < Devise::RegistrationsController
  respond_to :js
end

class SessionsController < Devise::SessionsController
  respond_to :js
end
```

That's surprisingly it for controllers. The rest is still handled by Devise.


#### Building the Registration Flow

To get the registration flow to work we need both sides of the form: happy path registration, which has been covered by many other blogs and is fairly easy to get working, and the non-happy path side where we need to display some errors on the form.

In order to enable the registration form to send requests to the server as AJAX we will need to add the `remote: true` flag to the form:

```erb
<%= form_for(resource, as: resource_name, url: registration_path(resource_name), remote: true) do |f| %>
  ...the rest of the form...
```

At this point you can submit the form with valid inputs and the user should get created on the back end but the page won't redirect to the `after_sign_in_path` like you would normally expect from Devise.  You may even see a MissingTemplate error for the create view.  To solve this we need a `create.js.erb` file in `app/views/users` that has some code which tells Turbolinks what to do on on the client.  (Note: I got this from [@packagethief's](https://github.com/packagethief) answer to this [GitHub Issue.](https://github.com/turbolinks/turbolinks/issues/85))

```erb
<% if resource.valid? %>
  Turbolinks.clearCache()
  Turbolinks.visit("<%= controller.after_sign_in_path_for(resource) %>", { action: 'replace' })
<% else %>
  $('form#new_user').replaceWith("<%=j render 'users/registrations/form' %>")
<% end %>
```

If the resource (Devise-speak for the user instance in this case) comes back as valid then we want to tell Turbolinks to clear the cache and [perform a visit](https://github.com/turbolinks/turbolinks#each-navigation-is-a-visit).  If the resource is not valid then we have experienced an error and need to show the relevant error messages which is easily done by replacing the existing form on the page with a newly rendered version of the form which includes the error messages.

It's important to note that in order to render just the form itself for the error case, I have extracted it into its own partial.

Using the `create.js.erb` for both success and error cases works for registrations because the Devise controller returns a 200 HTTP status for both cases so Rails will render the create view in either case.  This is not true for log in which leads us to...

#### Building the Log In Flow

First, we need to add `remote: true` to the form like we did for registrations:

```erb
<%= form_for(resource, as: resource_name, url: session_path(resource_name), remote: true) do |f| %>
```

And we also need a `create.js.erb` but this time it is only for the happy path because the error case for log in returns a 401 HTTP status so Rails will not render the create view for errors.  My `create.js.erb` for login does just a basic Turbolinks visit to the `after_sign_in_path_for`.

```javascript
Turbolinks.visit("<%= controller.after_sign_in_path_for(resource) %>")
```

For errors, things get a little more interesting.  Since Devise returns a 401 status and returns just the error message text to the browser then we need to add a listener for the `ajax:error` event to handle this properly. I embedded this listener in the view which is a technique I don't love but I'm not sure how to do this in a "better" way because this will be the only form that it ever applies to.  The listener looks like this:

```javascript
$('form#new_user').on('ajax:error', function(event, xhr, status, error) {
  $('#login-alerts').replaceWith("<div id='login-alerts' class='alert alert-danger'>" + xhr.responseText + "</div>")
});
```

This replaces a div with an id of "login-alerts" with a similar div that includes the error message text.

However since there are still some cases where we want to show normal Rails server-rendered errors on this form we still need the base view to include those. In order to do this I just use a fairly standard alerts partial inside of the `#login-alerts` div like this:

```erb
<div id="login-alerts">
  <%= render partial: 'shared/alerts', locals: {errors: resource.errors.full_messages} %>
</div>
```

Server rendered errors will populate that partial with error info and if we have any errors from the user during the login process then we will replace the whole div with the error messages we get back from the failed login attempt.

#### Conclusions

Getting all of these pieces working together has made it possible for me to be able to use Devise to handle the authentication for my app for both a normal web interface and through an iOS app which uses the [Turbolinks iOS framework.](https://github.com/turbolinks/turbolinks-ios)
