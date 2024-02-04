---
layout: post
title:  Authentication with Devise &amp; Turbolinks for iOS
lede: Setting up authentication for an iOS app with Devise &amp; Turbolinks.
tag: howto
date: 2016-10-03
---

I previously published this article with the first version of how I got {% include external_link.html link='https://github.com/plataformatec/devise' text='Devise 4.2'%} working with {% include external_link.html link='https://github.com/turbolinks/turbolinks' text='Turbolinks 5'%} through an iOS application.  The issue with that implementation was that, since {% include external_link.html link='https://github.com/turbolinks/turbolinks-ios' text='Turbolinks for iOS' %} manages a single shared web view, the authentication page shared the same web view in the iOS app with the rest of the pages.  This resulted in some weird navigation behaviors and required altogether too much JavaScript in the Rails side of my app to handle cases like errors on login.

After doing more research and really reading through the code in {% include external_link.html link='https://github.com/turbolinks/turbolinks-ios#running-the-demo' text='this Turbolinks iOS demo app' %} I realized that the much better implementation for this flow is to have the authentication screen be in it's own web view and to have it share a session with the rest of the app via a WKProcessPool instance that would be available to any other view that will need to be rendered after the user has been authenticated.

That is a what I'm trying to do here in this post.  If you have any questions please submit a {% include external_link.html link='https://github.com/thetizzo/thetizzo.github.io/issues' text='GitHub issue to this repo' %} because this is very much a work in progress for me and maybe we can work through similar issues together. :)

Here is my current implementation for the authentication process that works on web and in iOS.  It should be noted that most, if not all, of the Swift code in this post was taken from {% include external_link.html link='https://github.com/turbolinks/turbolinks-ios/tree/master/TurbolinksDemo' text='this Turbolinks iOS demo app' %} so thank you very much to the {% include external_link.html link='https://github.com/turbolinks/turbolinks-ios/graphs/contributors' text='people who put that together.' %}

## The Rails Side

On the Rails side of this application the basic setup is to move the Devise views into `app/views/users` and set up a custom controller for sessions that will know how to respond to JSON formatted requests.  Devise has an {% include external_link.html link='https://github.com/plataformatec/devise#configuring-views' text='install generator' %} that will copy the views for you.

In this implementation, the login form's `form_for` does not need to have the `remote: true` flag because it will **not** need to send an XHR request when POSTing the form.  I consider this to be a feature of this implementation because it simplifies some of the cases where errors need to be handled.

```ruby
# config/devise.rb
config.scoped_views = true

# config/routes.rb
devise_for :users, controllers: { sessions: 'sessions', registrations: 'registrations' }

# app/controllers/sessions_controller.rb
class SessionsController < Devise::SessionsController
  respond_to :json
end
```

Normally with Devise, when an unauthenticated user tries to navigate to a page Devise will respond with a 302 that redirects the user to the login page.  This will not work in iOS because a 302 means the same web view will be used to show the login page which pushes it onto the stack of navigable views. This is bad because once the user logs in they can hit a back button in the top navigation bar and end up back on the login page even though they are already authenticated.

Instead, the server should recognize when the user is using the iOS app and change the format of the request to JSON so that Devise will respond with a raw 401 to the client.  Then on the iOS side we can detect the 401 error and display a separate authentication view.

```ruby
# app/controllers/application_controller.rb
class ApplicationController < ActionController::Base
  # ...
  before_action :detect_browser

  def detect_browser
    case request.user_agent
    when /iPhone/i
      request.variant = :phone
      request.format = :json unless request.path.include?(Devise.mappings[:user].fullpath) || user_signed_in?
    else
      request.variant = :desktop
    end
  end
  # ...
end
```

## The iOS Side

On the iOS side of this I basically have 3 view controllers; `ApplicationController`, `AuthenticationController`, and `MyViewController`.

`ApplicationController` is the main controller for the application (and well named!).  It holds the host URL for the server and manages the `WKProcessPool` instance that is used to share a session between the `AuthenticationController` and `MyViewController`, which is important if you want your users to stay logged in after they log in.

`ApplicationController` acts as a `SessionDelegate`, so that it can catch errors that may happen when loading `Visitable` views. It also acts as an `AuthenticationControllerDelegate` so once the user has authenticated successfully, it can dismiss the `AuthenticationController` view and load the first page of the app.

In the `SessionDelegate` part of `ApplicationController` there is a method named `session:didFailRequestForVisitable:withError` that catches any HTTP failures and matches the response code to the case statement to see how it should handle that particular error.  This gives us a place to respond to the 401 and call `presentAuthenticationController()` which will render the `AuthenticationController` view.

```swift
// ApplicationController.swift
import UIKit
import WebKit
import Turbolinks

class ApplicationController: UINavigationController {
    private let URL = NSURL(string: "<Host URL>")!
    private let webViewProcessPool = WKProcessPool()

    private var application: UIApplication {
        return UIApplication.sharedApplication()
    }

    private lazy var webViewConfiguration: WKWebViewConfiguration = {
        let configuration = WKWebViewConfiguration()
        configuration.processPool = self.webViewProcessPool
        configuration.applicationNameForUserAgent = "myApp"
        return configuration
    }()

    private lazy var session: Session = {
        let session = Session(webViewConfiguration: self.webViewConfiguration)
        session.delegate = self
        return session
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        presentVisitableForSession(session, URL: URL)
    }

    private func presentVisitableForSession(session: Session, URL: NSURL, action: Action = .Advance) {
        let visitable = MyViewController(URL: URL)

        if action == .Advance {
            pushViewController(visitable, animated: true)
        } else if action == .Replace {
            popViewControllerAnimated(false)
            pushViewController(visitable, animated: false)
        }

        session.visit(visitable)
    }

    private func presentAuthenticationController() {
        let authenticationController = AuthenticationController()
        authenticationController.delegate = self
        authenticationController.webViewConfiguration = webViewConfiguration
        authenticationController.URL = URL.URLByAppendingPathComponent("/users/sign_in")
        authenticationController.title = "Log In"

        let authNavigationController = UINavigationController(rootViewController: authenticationController)
        presentViewController(authNavigationController, animated: true, completion: nil)
    }
}

extension ApplicationController: SessionDelegate {
    func session(session: Session, didProposeVisitToURL URL: NSURL, withAction action: Action) {
        presentVisitableForSession(session, URL: URL, action: action)
    }

    func session(session: Session, didFailRequestForVisitable visitable: Visitable, withError error: NSError) {
        guard let myViewController = visitable as? MyViewController, errorCode = ErrorCode(rawValue: error.code) else { return }

        switch errorCode {
        case .HTTPFailure:
            let statusCode = error.userInfo["statusCode"] as! Int
            switch statusCode {
            case 401:
                presentAuthenticationController()
            default:
                myViewController.presentError(Error(HTTPStatusCode: statusCode))
            }
        case .NetworkFailure:
            myViewController.presentError(.NetworkError)
        }
    }
}

extension ApplicationController: AuthenticationControllerDelegate {
    func authenticationControllerDidAuthenticate(authenticationController: AuthenticationController) {
        session.reload()
        dismissViewControllerAnimated(true, completion: nil)
    }
}
```

```swift
// AuthenticationController.swift
import UIKit
import WebKit

protocol AuthenticationControllerDelegate: class {
    func authenticationControllerDidAuthenticate(authenticationController: AuthenticationController)
}

class AuthenticationController: UIViewController {
    var URL: NSURL?
    var webViewConfiguration: WKWebViewConfiguration?
    weak var delegate: AuthenticationControllerDelegate?

    lazy var webView: WKWebView = {
        let configuration = self.webViewConfiguration ?? WKWebViewConfiguration()
        let webView = WKWebView(frame: CGRectZero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.navigationDelegate = self
        return webView
    }()

    override func viewDidLoad() {
        super.viewDidLoad()

        view.addSubview(webView)
        view.addConstraints(NSLayoutConstraint.constraintsWithVisualFormat("H:|[view]|", options: [], metrics: nil, views: [ "view": webView ]))
        view.addConstraints(NSLayoutConstraint.constraintsWithVisualFormat("V:|[view]|", options: [], metrics: nil, views: [ "view": webView ]))

        if let URL = self.URL {
            webView.loadRequest(NSURLRequest(URL: URL))
        }
    }
}

extension AuthenticationController: WKNavigationDelegate {
    func webView(webView: WKWebView, decidePolicyForNavigationAction navigationAction: WKNavigationAction, decisionHandler: (WKNavigationActionPolicy) -> Void) {
        if let URL = navigationAction.request.URL where URL != self.URL {
            decisionHandler(.Cancel)
            delegate?.authenticationControllerDidAuthenticate(self)
            return
        }

        decisionHandler(.Allow)
    }
}
```

## Conclusions

Never publish a blog post until you've lived with your implementation for a bit because you may have to completely rewrite it as a result finding a better implementation. :)
