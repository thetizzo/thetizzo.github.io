---
layout: post
title:  Authentication with Devise 4.2 and Turbolinks 5 for iOS
category: howto
date: 2016-10-03
---

I previously published this article with the first version of how I got [Devise 4.2](https://github.com/plataformatec/devise) working with [Turbolinks 5](https://github.com/turbolinks/turbolinks) through an iOS application.  The issue with that implementation was that, since [Turbolinks for iOS](https://github.com/turbolinks/turbolinks-ios) manages a single shared web view, the authentication page shared the same web view in the iOS app with the rest of the pages.  This resulted in some weird navigation behaviors and required altogether too much JavaScript in the Rails side of my app to handle cases like errors on login.

After doing more research and really reading through the code in [this Turbolinks iOS demo app](https://github.com/turbolinks/turbolinks-ios#running-the-demo) I realized that the much better implementation for this flow is to have the authentication screen be in it's own web view and to have it share a session with the rest of the app via a WKProcessPool instance that would be available to any other view that will need to be rendered after the user has been authenticated.

That is a what I'm trying to do here in this post.  If you have any questions please submit a [GitHub issue to this repo](https://github.com/thetizzo/thetizzo.github.io/issues) because this is very much a work in progress for me and maybe we can work through similar issues together. :)

Here is my current implementation for the authentication process that works on web and in iOS.  It should be noted that most, if not all, of the Swift code in this post was taken from [this Turbolinks iOS demo app](https://github.com/turbolinks/turbolinks-ios/tree/master/TurbolinksDemo) so thank you very much to the [people who put that together.](https://github.com/turbolinks/turbolinks-ios/graphs/contributors)

## The Rails Side

On the Rails side of this application the basic setup is to move the Devise views into `app/views/users` and set up a custom controller for sessions that will know how to respond to JSON formatted requests.  Devise has an [install generator](https://github.com/plataformatec/devise#configuring-views) that will copy the views for you.  

In this implementation, the login form's `form_for` does not need to have the `remote: true` flag because it will **not** need to send an XHR request when POSTing the form.  I consider this to be a feature of this implementation because it simplifies some of the cases where errors need to be handled.

{% gist thetizzo/5d652ba95d7ab1bae320403e004b081d %}

Normally with Devise, when an unauthenticated user tries to navigate to a page Devise will respond with a 302 that redirects the user to the login page.  This will not work in iOS because a 302 means the same web view will be used to show the login page which pushes it onto the stack of navigable views. This is bad because once the user logs in they can hit a back button in the top navigation bar and end up back on the login page even though they are already authenticated.

Instead, the server should recognize when the user is using the iOS app and change the format of the request to JSON so that Devise will respond with a raw 401 to the client.  Then on the iOS side we can detect the 401 error and display a separate authentication view.

{% gist thetizzo/f27a82abf98622a2d467391f45105c6c %}

## The iOS Side

On the iOS side of this I basically have 3 view controllers; ApplicationController, AuthenticationController, and MyViewController.

ApplicationController is the main controller for the application (and well named!).  It holds the host URL for the server and manages the WKProcessPool instance that is used to share a session between the AuthenticationController and MyViewController, which is important if you want your users to stay logged in after they log in.

ApplicationController acts as a SessionDelegate, so that it can catch errors that may happen when loading Visitable views. It also acts as an AuthenticationControllerDelegate so once the user has authenticated successfully, it can dismiss the AuthenticationController view and load the first page of the app.

In the SessionDelegate part of ApplicationController there is a method named `session:didFailRequestForVisitable:withError` that catches any HTTP failures and matches the response code to the case statement to see how it should handle that particular error.  This gives us a place to respond to the 401 and call `presentAuthenticationController()` which will render the AuthenticationController view.

{% gist thetizzo/8c8e452c9f013104c210e4008945ee64 %}

{% gist thetizzo/b6d302f9a2edb3f896db9e20c50e7df8 %}

## Conclusions

Never publish a blog post until you've lived with your implementation for a bit because you may have to completely rewrite it as a result finding a better implementation. :)

If you have any questions please submit a [GitHub issue to this repo](https://github.com/thetizzo/thetizzo.github.io/issues).
