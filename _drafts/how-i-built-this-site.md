---
layout: post
title:  How I Built This Site
---

One day recently, I decided to start a blog. I've tried this several times in the past but the project always seems to die when I try to figure out what to build it with or how to host it.

I’ve tried several platforms; Wordpress, Blogger, and even building the Classic Rails Blog™️ more than once. All of those solutions seem require a ton of work just to maintain the site.  What I really want is something that will be easy to set up, host, and will allow me to spend time on more interesting problems.

#### GitHub Pages to the rescue!

[Github Pages](https://pages.github.com/) came to my attention and at first glance it seemed easy to use so I decided to try it out. GitHub Pages has support for [Jekyll](http://jekyllrb.com/) which is a static site generator with support for writing blogs in Markdown.

#### Setting up a GitHub Page

The first thing I did to set this up was to create a git repo named `<your-github-username>.github.io`.

In my case this was `thetizzo.github.io`. Make sure that your username is spelled correctly and the name of the repo matches this format or GitHub Pages will not display the site correctly.

#### Setting up Jekyll

GitHub has an automatic page generator available for Pages sites that you can find in the `Settings > Options > GitHub Pages` but I wanted more flexibilty with the theme and style of the site so I decided to use Jekyll instead.

To get Jekyll set up I ran these 3 steps:

{% highlight bash %}
$ gem install jekyll
$ jekyll new thetizzo.github.io
$ jekyll serve
{% endhighlight %}

At this point you can go to `localhost:4000` and see the default Jekyll site.

#### Integrating a theme

If you want you can start writing blogs posts right away but I wanted to change the theme of the site make it my own. Jekyll lets you build anything so you could use custom CSS to design the site any way you want or you can download a pre-made theme from several sites.

Another goal I had for this site was to have a place to put an online résumé. I found [this](https://github.com/jglovier/resume-template) theme on [jekyllthemes.org](http://jekyllthemes.org/) which I thought would look great for a résumé.

`put something here about how I integrated that theme`

#### Adding Google Analytics

To add Google Analytics to the site I created this file  `_includes/google_analytics.html`.  In that file I put the code snippet that Google gives you when you sign up for Analytics which looks something like this:

{% highlight html %}
<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', '<your tracking ID number>', 'auto');
  ga('send', 'pageview');
</script>
{% endhighlight %}

Then included that file in `_includes/head.html` like this:

{% highlight html %}
<head>
  ...
  {% raw %}{% include google_analytics.html %}{% endraw %}
</head>
{% endhighlight %}

#### Adding SSL

This isn't strictly necessary because the code for the site is all public anyway but it's more fun to have an HTTPS site.

I signed up for a [CloudFlare](https://www.cloudflare.com/) account because they have a [free plan](https://www.cloudflare.com/plans/) that provides SSL.  This was super easy, they even scraped all my existing DNS records automatically.

For the rest of the set up I followed this [post](https://www.benburwell.com/posts/configuring-cloudflare-universal-ssl/)
