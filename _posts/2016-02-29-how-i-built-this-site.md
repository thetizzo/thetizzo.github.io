---
layout: post
title:  How I Built This Site
lede: How I built this blog with GitHub Pages and Jekyll.
tag: howto
date: 2016-02-29
---

Once upon a time, I decided to start a blog. I've tried this several times in the past but the project always seems to die when it comes to figuring out what technology to use or how to host it.

I’ve tried several platforms; Wordpress, Blogger, and even building the Classic Rails Blog™️ more than once. All of those solutions seem to require a ton of work just to maintain the site.  What I really want is something that is easy to set up, host, and will allow me to spend time on more interesting problems.

## GitHub Pages to the rescue!

{% include external_link.html link='https://pages.github.com/' text='Github Pages' %} came to my attention and at first glance it seemed easy to use so I decided to try it out. GitHub offers an automatic page generator for Pages sites that you can access in `Settings > Options > GitHub Pages` but this doesn't seem to offer as much flexibility for the theme and layout of the site as I wanted.

Fortunately, GitHub Pages has support for {% include external_link.html link='http://jekyllrb.com/' text='Jekyll' %} which is a static site generator with support for writing blogs in Markdown.

Here's what I had to do to make this work.

## Setting up a GitHub Page

The first thing I did to set this up was to create a git repo named `<your-github-username>.github.io`.

In my case this was `thetizzo.github.io`. It is important to make sure that your username is spelled correctly and the name of the repo matches this format or GitHub Pages will not display the site correctly.

For personal GitHub Pages, the site will automatically be served using the master branch of this repository.  It's shocking how quickly changes will show up on the actual site once you push them to GitHub.  It often doesn't take more than a few seconds.

## Setting up Jekyll

To get Jekyll set up I ran these 3 steps:

```shell
gem install jekyll
jekyll new thetizzo.github.io
jekyll serve
```

At this point you can go to `localhost:4000` and see the default Jekyll site.

## Integrating a theme

If you want, you can start writing blogs posts right away, but I wanted to change the theme of the site make it my own. Jekyll lets you build anything so you could use Sass to design the site any way you want or you can download a pre-made theme, which are available from several places.

I decided to use a pre-made theme because I figured that working through integrating that theme with my site would be a great way to gain a better understanding of how to work with Jekyll.

I found {% include external_link.html link='https://github.com/jglovier/resume-template' text='this theme' %} on {% include external_link.html link='http://jekyllthemes.org/' text='jekyllthemes.org' %} and thought it was a nice, clean look that would be a good starting place for my site.

This theme is set up to be it's own standalone site so in order to integrate it I started by setting up a new page that would use a separate layout from the rest of the site.  To add a new page to the site you just need to add an HTML file to the project root. In my case this was `resume.html` which looks like this:

```yaml
---
layout: resume
---
```

That's really it.  In Jekyll, anything at the top of a file between the dashes is called {% include external_link.html link='https://jekyllrb.com/docs/frontmatter/' text='Front Matter' %} and can be used to pass variables and defaults into a page.

Since I'm using a theme, I just need the front matter for `resume.html` to point to the `_layouts/resume.html` layout file which will end up being the place where the bulk of the page structure is.

I then copied over the rest of the theme to the appropriate places, making sure to namespace all the files to keep the two different themes (default and resume) separate until I was ready to combine them.  It looked something like this:

```shell
resume-template -> my_project

_config.yml contents -> _config.yml
_layouts/resume.html -> _layouts/resume.html
css/main.scss -> css/resume-main.scss
_sass/*.scss -> _sass/resume-*.scss
_includes/*.html -> _includes/resume-*.html
_includes/*.html -> _includes/resume-*.html
```

I was then able to build a resume page using this theme while leaving the rest of the existing site alone. Once that was finished, I merged the styles from the resume page into the default layout by removing the default theme styles and removing the namespace for the resume styles and files so they would apply everywhere on the site.

## Using Font Awesome with Jekyll

I personally love {% include external_link.html link='https://fortawesome.github.io/Font-Awesome/' text='Font Awesome.'%} If you haven't heard of Font Awesome, it's a set of icons that you can easily include in your site.  They are included as a font to your site so you can easily customize them with CSS.

Font Awesome offers a CDN to serve the assets so including them in a project is super easy.  I simply added the following line to `_includes/head.html`:

```html
<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
```

## Setting up a custom domain

Another nice thing about GitHub Pages is that they offer a super easy way to put your own custom domain on the site.  This is nice because it gives you the performance benefits of GitHub's CDN but also let's the site have the feel of a completely custom website.

I will let {% include external_link.html link='https://help.github.com/articles/using-a-custom-domain-with-github-pages/' text="GitHub's own instructions" %} speak for themselves on this matter but basically all I had to do was add a CNAME record through my DNS provider for `thetizzo.com` to point at `thetizzo.github.io` and add a file called `CNAME` to the root of the project that {% include external_link.html link='https://github.com/thetizzo/thetizzo.github.io/blob/master/CNAME' text='looks like this.' %}

## Adding Google Analytics

To add Google Analytics to the site I created a file, `_includes/google_analytics.html`, and put in the code snippet that Google gives you when you sign up for Analytics which looks something like this:

```html
<script>
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');

  ga('create', '<your tracking ID number>', 'auto');
  ga('send', 'pageview');
</script>
```

Then included that file in `_includes/head.html`:

```html
<!-- some head content -->
{% raw %}{% include google_analytics.html %}{% endraw %}
<!-- the rest of the head content -->
```

## Have fun!

Hopefully this was helpful.  Good luck and have fun with your new, highly advanced GitHub page.
